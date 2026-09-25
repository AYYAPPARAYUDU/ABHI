"""WebSocket Telemetry Hub for Real-time Frontend Synchronization."""

import json
from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from backend.app.core.logging import logger

router = APIRouter(tags=["WebSockets"])


class ConnectionManager:
    """Manages active WebSocket client connections."""

    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WebSocket client connected. Total clients: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info(f"WebSocket client disconnected. Total clients: {len(self.active_connections)}")

    async def broadcast(self, message: dict):
        """Broadcast a message to all connected clients."""
        payload_str = json.dumps(message)
        for connection in self.active_connections:
            try:
                await connection.send_text(payload_str)
            except Exception as e:
                logger.warning(f"Failed to send to WebSocket client: {str(e)}")


manager = ConnectionManager()


@router.websocket("/ws/telemetry")
async def websocket_telemetry_endpoint(websocket: WebSocket):
    """Bidirectional WebSocket endpoint for live UI telemetry and heartbeat."""
    await manager.connect(websocket)
    try:
        # Send initial connection handshake
        await websocket.send_text(
            json.dumps({
                "type": "HANDSHAKE_ACK",
                "timestamp": int(datetime.now(timezone.utc).timestamp() * 1000),
                "payload": {"status": "connected", "channel": "telemetry"}
            })
        )

        while True:
            data_text = await websocket.receive_text()
            try:
                msg = json.loads(data_text)
                msg_type = msg.get("type", "")

                # Handle PING/PONG heartbeats
                if msg_type == "PING":
                    await websocket.send_text(
                        json.dumps({
                            "type": "PONG",
                            "timestamp": int(datetime.now(timezone.utc).timestamp() * 1000)
                        })
                    )
                else:
                    # Echo back received event for verification
                    await websocket.send_text(
                        json.dumps({
                            "type": "EVENT_RECEIVED",
                            "correlation_id": msg.get("message_id"),
                            "timestamp": int(datetime.now(timezone.utc).timestamp() * 1000)
                        })
                    )
            except json.JSONDecodeError:
                await websocket.send_text(
                    json.dumps({
                        "type": "ERROR",
                        "error": {"code": "INVALID_JSON", "message": "Payload must be valid JSON"}
                    })
                )
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {str(e)}")
        manager.disconnect(websocket)
