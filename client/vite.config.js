import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    server: {
        port: 1234,
        // Bind to all network interfaces (not just localhost) so phones on the
        // same Wi-Fi can reach the dev server at this computer's LAN IP.
        host: true
    }
})
