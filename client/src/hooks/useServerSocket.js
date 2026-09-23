import { useEffect, useRef, useState } from 'react';

export default function useServerSocket() {
  const [wlValue, setWlValue] = useState(null);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef(null);

  useEffect(() => {
    // Same host the page was loaded from (localhost on this computer, or this
    // computer's LAN IP when opened from a phone), not a hardcoded env var —
    // otherwise a phone would try to open a WebSocket to its own "localhost".
    const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    const protocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${hostname}:3001`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.addEventListener('open', () => {
        console.log('WS connected to', wsUrl);
        setConnected(true);
      });

      ws.addEventListener('message', (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          if (msg?.type === 'sensor-reading') {
            const rawValue = msg.wl_value ?? msg.wlValue ?? msg.value;
            const v = Number(rawValue);
            console.debug('WS sensor-reading received', msg.esp32_id, v);
            if (!Number.isNaN(v)) setWlValue(v);
          }
        } catch (err) {
          console.warn('Invalid WS message', err);
        }
      });

      ws.addEventListener('close', () => {
        console.log('WS disconnected');
        setConnected(false);
      });
      ws.addEventListener('error', (e) => console.error('WS error', e));

      return () => {
        try { ws.close(); } catch (e) {}
      };
    } catch (err) {
      console.error('Failed to create WS', err);
    }
  }, []);

  return { wlValue, connected };
}
