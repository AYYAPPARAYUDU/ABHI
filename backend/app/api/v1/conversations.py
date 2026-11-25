"""Conversations & Multi-Turn Chat API Router."""

import json
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from backend.app.core.config import settings
from backend.app.core.logging import logger
from backend.app.services.llm.ollama_client import ollama_client
from backend.app.services.memory.conversation_repository import conversation_repository

router = APIRouter(prefix="/conversations", tags=["Conversations"])


class CreateConversationRequest(BaseModel):
    title: Optional[str] = Field(default=None, description="Optional title for the conversation")
    model: Optional[str] = Field(default=None, description="Target model name (defaults to abhi:latest)")


class UpdateConversationRequest(BaseModel):
    title: Optional[str] = Field(default=None, description="Updated conversation title")
    is_archived: Optional[bool] = Field(default=None, description="Archive status flag")


class SendMessageRequest(BaseModel):
    content: str = Field(..., min_length=1, description="Text prompt or message content")
    model: Optional[str] = Field(default=None, description="Model to invoke for assistant generation")


@router.get("", response_model=List[Dict[str, Any]], summary="List all conversations")
async def list_conversations(
    include_archived: bool = Query(default=False, description="Include archived conversations"),
    search: Optional[str] = Query(default=None, description="Search keyword query across titles and contents"),
    q: Optional[str] = Query(default=None, description="Alternative alias for search query"),
    limit: int = Query(default=100, ge=1, le=500, description="Max conversations to return"),
    offset: int = Query(default=0, ge=0, description="Pagination offset"),
) -> List[Dict[str, Any]]:
    """Retrieve conversations sorted by most recently updated."""
    query_term = search or q
    return await conversation_repository.list_conversations(
        include_archived=include_archived,
        search_query=query_term,
        limit=limit,
        offset=offset,
    )


@router.post("", response_model=Dict[str, Any], status_code=status.HTTP_201_CREATED, summary="Create conversation")
async def create_conversation(request: CreateConversationRequest) -> Dict[str, Any]:
    """Create a new conversational thread."""
    return await conversation_repository.create_conversation(
        title=request.title,
        model=request.model,
    )


@router.get("/{conversation_id}", response_model=Dict[str, Any], summary="Get conversation and all messages")
async def get_conversation(conversation_id: str) -> Dict[str, Any]:
    """Retrieve a conversation by ID, including its full chronological message history."""
    conv = await conversation_repository.get_conversation(conversation_id)
    if not conv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Conversation '{conversation_id}' not found.",
        )
    return conv


@router.patch("/{conversation_id}", response_model=Dict[str, Any], summary="Update conversation")
async def update_conversation(
    conversation_id: str,
    request: UpdateConversationRequest,
) -> Dict[str, Any]:
    """Update title or archived status of a conversation."""
    updated = await conversation_repository.update_conversation(
        conv_id=conversation_id,
        title=request.title,
        is_archived=request.is_archived,
    )
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Conversation '{conversation_id}' not found.",
        )
    return updated


@router.delete("/{conversation_id}", response_model=Dict[str, Any], summary="Delete conversation")
async def delete_conversation(conversation_id: str) -> Dict[str, Any]:
    """Delete a conversation and all its historical messages."""
    deleted = await conversation_repository.delete_conversation(conversation_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Conversation '{conversation_id}' not found.",
        )
    return {
        "success": True,
        "id": conversation_id,
        "message": f"Conversation '{conversation_id}' deleted successfully.",
    }


@router.post("/{conversation_id}/messages", response_model=Dict[str, Any], summary="Post user message & generate response")
async def post_message(
    conversation_id: str,
    request: SendMessageRequest,
) -> Dict[str, Any]:
    """Post user message, route command through AgentGateway / Ollama, and persist assistant response."""
    conv = await conversation_repository.get_conversation(conversation_id)
    if not conv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Conversation '{conversation_id}' not found.",
        )

    target_model = request.model or conv.get("model") or getattr(settings, "OLLAMA_DEFAULT_MODEL", "abhi:latest")

    # 1. Save user turn
    user_msg = await conversation_repository.add_message(
        conv_id=conversation_id,
        role="user",
        content=request.content,
        model=target_model,
    )

    # 2. Route command through Authoritative AgentGateway (or fallback to Ollama client)
    assistant_content = ""
    tool_invocations = None

    try:
        from backend.app.cognitive.gateway.agent_gateway import agent_gateway
        from backend.app.cognitive.gateway.models import AgentCommandRequest, InputMode

        cmd_req = AgentCommandRequest(
            text=request.content,
            thread_id=conversation_id,
            input_mode=InputMode.TEXT,
        )
        cmd_resp = await agent_gateway.process_command(cmd_req)
        assistant_content = cmd_resp.message
        if not assistant_content and cmd_resp.result:
            if isinstance(cmd_resp.result, dict):
                assistant_content = cmd_resp.result.get("answer") or str(cmd_resp.result)
            else:
                assistant_content = str(cmd_resp.result)

        if cmd_resp.result:
            tool_invocations = cmd_resp.result
    except Exception as gw_err:
        logger.warning(f"AgentGateway routing notice: {gw_err}; falling back to local Ollama client.")
        assistant_content = ""

    # If gateway returned no text or encountered error, fallback directly to Ollama generation
    if not assistant_content:
        try:
            res = await ollama_client.generate(
                prompt=request.content,
                model=target_model,
                options={"num_ctx": 2048},
            )
            assistant_content = res.response
        except Exception as llm_err:
            logger.error(f"Ollama generation fallback error: {llm_err}")
            assistant_content = f"Unable to generate response from model '{target_model}': {llm_err}"

    # 3. Save assistant turn
    assistant_msg = await conversation_repository.add_message(
        conv_id=conversation_id,
        role="assistant",
        content=assistant_content,
        model=target_model,
        tool_invocations=tool_invocations,
    )

    return {
        "conversation_id": conversation_id,
        "user_message": user_msg,
        "assistant_message": assistant_msg,
    }


@router.post("/{conversation_id}/messages/stream", summary="Stream assistant response via Server-Sent Events (SSE)")
async def stream_message(
    conversation_id: str,
    request: SendMessageRequest,
) -> StreamingResponse:
    """Stream token chunks from local Ollama model via SSE (num_ctx: 2048) and persist assistant turn upon completion."""
    conv = await conversation_repository.get_conversation(conversation_id)
    if not conv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Conversation '{conversation_id}' not found.",
        )

    target_model = request.model or conv.get("model") or getattr(settings, "OLLAMA_DEFAULT_MODEL", "abhi:latest")

    # 1. Save user turn immediately
    user_msg = await conversation_repository.add_message(
        conv_id=conversation_id,
        role="user",
        content=request.content,
        model=target_model,
    )

    async def token_generator():
        accumulated_chunks: List[str] = []

        # Yield user message acknowledgement event
        yield f"data: {json.dumps({'event': 'user_message_created', 'message': user_msg})}\n\n"

        # Resolve streaming method (generate_stream or stream_generate alias)
        stream_fn = getattr(ollama_client, "stream_generate", getattr(ollama_client, "generate_stream", None))
        if stream_fn is None:
            err_msg = "Ollama client does not support streaming generation."
            yield f"data: {json.dumps({'error': err_msg})}\n\n"
            return

        try:
            stream_iter = stream_fn(
                prompt=request.content,
                model=target_model,
                options={"num_ctx": 2048},
            )
            async for chunk in stream_iter:
                if chunk:
                    accumulated_chunks.append(chunk)
                    payload = {"token": chunk, "done": False}
                    yield f"data: {json.dumps(payload)}\n\n"
        except Exception as ex:
            logger.error(f"Streaming token generation error for conversation '{conversation_id}': {ex}")
            yield f"data: {json.dumps({'error': str(ex)})}\n\n"

        full_reply = "".join(accumulated_chunks).strip()
        if not full_reply:
            full_reply = "(No response generated)"

        # 2. Persist assistant turn in SQLite WAL upon completion
        assistant_msg = await conversation_repository.add_message(
            conv_id=conversation_id,
            role="assistant",
            content=full_reply,
            model=target_model,
        )

        # Yield completion payload
        yield f"data: {json.dumps({'done': True, 'message_id': assistant_msg['id'], 'full_response': full_reply})}\n\n"
        yield "data: [DONE]\n\n"

    headers = {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
    }
    return StreamingResponse(token_generator(), media_type="text/event-stream", headers=headers)
