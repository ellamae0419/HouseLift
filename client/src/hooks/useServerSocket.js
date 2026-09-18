import { useEffect, useRef, useState } from 'react';

export default function useServerSocket() {
  const [wlValue, setWlValue] = useState(null);
  const wsRef = useRef(null);

  useEffect(() => {
    const api = import.meta.env.VITE_API_URL;
    const fallbackOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001';
    const baseUrl = api || fallbackOrigin;
    const parsed = new URL(baseUrl, fallbackOrigin);
    const wsUrl = `${parsed.protocol === 'https:' ? 'wss:' : 'ws:'}//${parsed.host}`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.addEventListener('open', () => {
        console.log('WS connected to', wsUrl);
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

      ws.addEventListener('close', () => console.log('WS disconnected'));
      ws.addEventListener('error', (e) => console.error('WS error', e));

      return () => {
        try { ws.close(); } catch (e) {}
      };
    } catch (err) {
      console.error('Failed to create WS', err);
    }
  }, []);

  return { wlValue };
}
