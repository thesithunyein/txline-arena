'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { demoLiveSignal } from './demo';

const WS_URL =
  process.env.NEXT_PUBLIC_WS_URL ||
  (typeof window !== 'undefined' && window.location.hostname !== 'localhost'
    ? 'wss://thesithunyein-txline-arena-api.hf.space/ws'
    : 'ws://localhost:3001/ws');
const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
// How long to wait for a real socket before falling back to simulated events.
const SIM_FALLBACK_MS = 3500;
// Cadence of simulated signal events when no backend is reachable.
const SIM_INTERVAL_MS = 4000;

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
  const simTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  const stopSimulation = useCallback(() => {
    if (simTimerRef.current) {
      clearInterval(simTimerRef.current);
      simTimerRef.current = null;
    }
  }, []);

  // Emit deterministic simulated signal events so the dashboard stays alive on
  // the public link / in the demo video when no live backend is connected.
  const startSimulation = useCallback(() => {
    if (simTimerRef.current) return;
    const emit = () => {
      const event: ArenaEvent = {
        type: 'signal',
        data: demoLiveSignal(),
        timestamp: Date.now(),
      };
      setEvents((prev) => [...prev.slice(-99), event]);
      onEventRef.current?.(event);
    };
    emit();
    simTimerRef.current = setInterval(emit, SIM_INTERVAL_MS);
  }, []);

  const connect = useCallback(() => {
    if (DEMO_MODE) {
      startSimulation();
      return;
    }
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    // If the socket doesn't open quickly, start simulated events as a fallback.
    if (!fallbackTimerRef.current) {
      fallbackTimerRef.current = setTimeout(() => startSimulation(), SIM_FALLBACK_MS);
    }

    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        reconnectRef.current = 0;
        if (fallbackTimerRef.current) {
          clearTimeout(fallbackTimerRef.current);
          fallbackTimerRef.current = null;
        }
        stopSimulation();
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
  }, [startSimulation, stopSimulation]);

  useEffect(() => {
    connect();
    return () => {
      wsRef.current?.close();
      stopSimulation();
      if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
    };
  }, [connect, stopSimulation]);

  return { connected, events };
}
