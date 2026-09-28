import { Injectable, signal, computed, OnDestroy } from '@angular/core';
import { Subject, Observable } from 'rxjs';
import { ConnectionStatus, TelemetryEvent } from '../models/telemetry.model';

@Injectable({
  providedIn: 'root'
})
export class TelemetryService implements OnDestroy {
  private socket: WebSocket | null = null;
  private readonly maxBufferSize = 100;
  private reconnectAttempts = 0;
  private maxReconnectDelayMs = 10000;
  private reconnectTimer: any = null;
  private heartbeatTimer: any = null;
  private isDestroyed = false;

  // Reactive State Signals
  readonly connectionStatus = signal<ConnectionStatus>('DISCONNECTED');
  readonly eventBuffer = signal<TelemetryEvent[]>([]);
  readonly latestEvent = signal<TelemetryEvent | null>(null);

  // Observable stream for components
  private readonly eventSubject = new Subject<TelemetryEvent>();
  readonly events$: Observable<TelemetryEvent> = this.eventSubject.asObservable();

  // Computed helper
  readonly isConnected = computed(() => this.connectionStatus() === 'CONNECTED');
  readonly totalEventsReceived = computed(() => this.eventBuffer().length);

  constructor() {
    this.connect();
  }

  /**
   * Initialize or reconnect the live WebSocket telemetry connection.
   */
  connect(url: string = this.getDefaultWebSocketUrl()): void {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.connectionStatus.set(this.reconnectAttempts > 0 ? 'RECONNECTING' : 'DISCONNECTED');

    try {
      this.socket = new WebSocket(url);

      this.socket.onopen = () => {
        this.reconnectAttempts = 0;
        this.connectionStatus.set('CONNECTED');
        this.startHeartbeat();
      };

      this.socket.onmessage = (event: MessageEvent) => {
        try {
          const raw = event.data;
          const parsed = JSON.parse(raw);
          const telemetryEvent: TelemetryEvent = {
            id: parsed.id || `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            channel: parsed.channel || 'telemetry',
            type: parsed.type || 'UNKNOWN',
            task_id: parsed.task_id,
            timestamp: parsed.timestamp || Date.now(),
            component: parsed.component || parsed.source,
            status: parsed.status,
            payload: parsed.payload || {},
            rawJson: raw
          };

          this.handleIncomingEvent(telemetryEvent);
        } catch (err) {
          console.warn('Failed to parse WebSocket telemetry event:', err);
        }
      };

      this.socket.onerror = () => {
        this.connectionStatus.set('ERROR');
      };

      this.socket.onclose = () => {
        this.stopHeartbeat();
        this.connectionStatus.set('DISCONNECTED');
        if (!this.isDestroyed) {
          this.scheduleReconnect(url);
        }
      };
    } catch (err) {
      this.connectionStatus.set('ERROR');
      if (!this.isDestroyed) {
        this.scheduleReconnect(url);
      }
    }
  }

  /**
   * Handle incoming structured telemetry event with bounded buffer retention.
   */
  private handleIncomingEvent(event: TelemetryEvent): void {
    // Ignore heartbeat PONGs from buffer
    if (event.type === 'PONG' || event.type === 'HANDSHAKE_ACK' || event.type === 'EVENT_RECEIVED') {
      return;
    }

    this.latestEvent.set(event);

    // Update bounded buffer immutably
    this.eventBuffer.update((prev) => {
      const updated = [event, ...prev];
      if (updated.length > this.maxBufferSize) {
        return updated.slice(0, this.maxBufferSize);
      }
      return updated;
    });

    this.eventSubject.next(event);
  }

  /**
   * Send client message to WebSocket server.
   */
  sendMessage(message: Record<string, any>): boolean {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
      return true;
    }
    return false;
  }

  /**
   * Clear local telemetry buffer on demand.
   */
  clearBuffer(): void {
    this.eventBuffer.set([]);
  }

  /**
   * Periodic PING to keep connection alive and measure latency.
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      this.sendMessage({ type: 'PING', timestamp: Date.now() });
    }, 15000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private scheduleReconnect(url: string): void {
    if (this.reconnectTimer || this.isDestroyed) return;

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), this.maxReconnectDelayMs);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect(url);
    }, delay);
  }

  private getDefaultWebSocketUrl(): string {
    const loc = typeof window !== 'undefined' ? window.location : null;
    const protocol = loc && loc.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = loc && loc.hostname ? loc.hostname : '127.0.0.1';
    return `${protocol}//${host}:8000/ws/telemetry`;
  }

  ngOnDestroy(): void {
    this.isDestroyed = true;
    this.stopHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }
}
