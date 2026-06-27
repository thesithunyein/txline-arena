'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001/ws';

export interface ArenaEvent {
  type: 'signal' | 'position_open' | 'position_settle' | 'score_update' | 'leaderboard_update' | 'match_end';
  data: any;
  timestamp: number;
}

export function useWebSocket(onEvent?: (event: ArenaEvent) => void) {
  const [connected, setConnected] = useState(false);
  const [events, setEvents] = useState<ArenaEvent[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<number>(0);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        reconnectRef.current = 0;
      };

      ws.onmessage = (msg) => {
        try {
          const event: ArenaEvent = JSON.parse(msg.data);
          setEvents((prev) => [...prev.slice(-99), event]);
          onEventRef.current?.(event);
        } catch {}
      };

      ws.onclose = () => {
        setConnected(false);
        const delay = Math.min(1000 * Math.pow(2, reconnectRef.current), 30000);
        reconnectRef.current++;
        setTimeout(connect, delay);
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch {
      const delay = Math.min(1000 * Math.pow(2, reconnectRef.current), 30000);
      reconnectRef.current++;
      setTimeout(connect, delay);
    }
  }, []);

  useEffect(() => {
    connect();
    return () => {
      wsRef.current?.close();
    };
  }, [connect]);

  return { connected, events };
}
