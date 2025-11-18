import { io, Socket } from 'socket.io-client';
import { tokenStorage } from '@/api/client';
import type {
  WebSocketEvent,
  RescueStatusUpdateEvent,
  DriverLocationUpdateEvent,
} from '@/types';

/**
 * WebSocket Event Handlers
 */
type EventHandler<T = unknown> = (data: T) => void;

/**
 * WebSocket Client Class
 *
 * Manages Socket.IO connection and event handlers
 */
class WebSocketClient {
  private socket: Socket | null = null;
  private handlers: Map<string, Set<EventHandler>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isConnecting = false;

  /**
   * Connect to WebSocket server
   */
  public connect(): void {
    if (this.socket?.connected || this.isConnecting) {
      console.log('WebSocket already connected or connecting');
      return;
    }

    this.isConnecting = true;

    const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:3001';
    const token = tokenStorage.getAccessToken();

    if (!token) {
      console.warn('No auth token available, skipping WebSocket connection');
      this.isConnecting = false;
      return;
    }

    console.log('Connecting to WebSocket server...');

    this.socket = io(WS_URL, {
      auth: {
        token,
      },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: this.reconnectDelay,
      reconnectionDelayMax: 5000,
    });

    this.setupSocketListeners();
    this.isConnecting = false;
  }

  /**
   * Disconnect from WebSocket server
   */
  public disconnect(): void {
    if (this.socket) {
      console.log('Disconnecting from WebSocket server...');
      this.socket.disconnect();
      this.socket = null;
      this.handlers.clear();
      this.reconnectAttempts = 0;
    }
  }

  /**
   * Check if connected
   */
  public isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  /**
   * Subscribe to event
   */
  public on<T = unknown>(event: string, handler: EventHandler<T>): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }

    this.handlers.get(event)!.add(handler as EventHandler);

    // Return unsubscribe function
    return () => this.off(event, handler);
  }

  /**
   * Unsubscribe from event
   */
  public off<T = unknown>(event: string, handler: EventHandler<T>): void {
    const handlers = this.handlers.get(event);
    if (handlers) {
      handlers.delete(handler as EventHandler);
    }
  }

  /**
   * Emit event to server
   */
  public emit(event: string, data?: unknown): void {
    if (!this.socket) {
      console.warn('WebSocket not connected, cannot emit event:', event);
      return;
    }

    this.socket.emit(event, data);
  }

  /**
   * Join a room
   */
  public joinRoom(room: string): void {
    this.emit('join', { room });
  }

  /**
   * Leave a room
   */
  public leaveRoom(room: string): void {
    this.emit('leave', { room });
  }

  /**
   * Setup socket event listeners
   */
  private setupSocketListeners(): void {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
      this.notifyHandlers('connected', {});
    });

    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      this.notifyHandlers('disconnected', { reason });
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      this.reconnectAttempts++;

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('Max reconnection attempts reached');
        this.disconnect();
      }
    });

    // Application events
    this.socket.on('rescue:status_update', (data: RescueStatusUpdateEvent) => {
      console.log('Rescue status update:', data);
      this.notifyHandlers('rescue:status_update', data);
    });

    this.socket.on('driver:location_update', (data: DriverLocationUpdateEvent) => {
      console.log('Driver location update:', data);
      this.notifyHandlers('driver:location_update', data);
    });

    this.socket.on('notification:new', (data: unknown) => {
      console.log('New notification:', data);
      this.notifyHandlers('notification:new', data);
    });

    this.socket.on('rescue:matched', (data: unknown) => {
      console.log('Rescue matched:', data);
      this.notifyHandlers('rescue:matched', data);
    });

    this.socket.on('rescue:driver_assigned', (data: unknown) => {
      console.log('Driver assigned:', data);
      this.notifyHandlers('rescue:driver_assigned', data);
    });

    this.socket.on('rescue:completed', (data: unknown) => {
      console.log('Rescue completed:', data);
      this.notifyHandlers('rescue:completed', data);
    });

    this.socket.on('rescue:cancelled', (data: unknown) => {
      console.log('Rescue cancelled:', data);
      this.notifyHandlers('rescue:cancelled', data);
    });
  }

  /**
   * Notify all handlers for an event
   */
  private notifyHandlers(event: string, data: unknown): void {
    const handlers = this.handlers.get(event);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in handler for event ${event}:`, error);
        }
      });
    }
  }
}

/**
 * Singleton WebSocket client instance
 */
export const wsClient = new WebSocketClient();

/**
 * Hook for WebSocket events
 */
export function useWebSocketEvent<T = unknown>(
  event: string,
  handler: EventHandler<T>,
): void {
  React.useEffect(() => {
    const unsubscribe = wsClient.on(event, handler);
    return unsubscribe;
  }, [event, handler]);
}

/**
 * Initialize WebSocket connection (call on app startup)
 */
export function initializeWebSocket(): void {
  wsClient.connect();
}

/**
 * Cleanup WebSocket connection (call on app shutdown or logout)
 */
export function cleanupWebSocket(): void {
  wsClient.disconnect();
}

// Add React import for the hook
import React from 'react';
