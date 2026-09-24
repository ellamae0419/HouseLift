global.db = require('../database/db');
require('dotenv').config()

// Some hosts (e.g. Railway containers) resolve outbound hosts to an IPv6
// address but have no working IPv6 route, causing ENETUNREACH — hangs (or,
// once timeouts are set, fast failures) on any host that publishes AAAA
// records, such as Gmail's SMTP server. Preferring IPv4 avoids that.
require('dns').setDefaultResultOrder('ipv4first');

// A single unhandled DB (or other async) rejection should not take the whole
// server down. Log it and keep serving other requests instead of crashing.
process.on('unhandledRejection', (err) => {
    console.log("\x1b[31m%s\x1b[0m", `[server] Unhandled rejection: ${err?.message || err}`);
});

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const verifyJWT = require('./middlewares/verifyJWT');
const WebSocket = require('ws');
const http = require('http');
console.log("\x1b[36m%s\x1b[0m", `Starting the server side...\n`);

const app = express();
const server = http.createServer(app);

// fallback port when PORT not provided in env
const PORT = process.env.PORT || 3001;

global.wss = new WebSocket.Server({ server });

// heartbeat to detect and clean up dead clients
function noop() {}
function heartbeat() { this.isAlive = true; }

global.wss.on('connection', (ws, req) => {
    ws.isAlive = true;
    ws.on('pong', heartbeat);

    const remoteAddr = req.socket.remoteAddress || 'unknown';
    ws._remoteAddr = remoteAddr;
    console.log('✓ WebSocket client connected', remoteAddr);
    try {
        console.log('  WS handshake headers:', req.headers || {});
    } catch (e) {
        console.log('  Failed to read WS headers');
    }

    ws.on('message', (message) => {
        let msg;
        try {
            msg = JSON.parse(message.toString());
        } catch (err) {
            console.log('Invalid WS message received from', ws._remoteAddr, err.message);
            return;
        }

        // Log sensor-reading messages for debugging
        if (msg && msg.type === 'sensor-reading') {
            console.log('Received sensor-reading from', ws._remoteAddr, '->', msg);
            let sent = 0;
            global.wss.clients.forEach((client) => {
                try {
                    const state = client.readyState === WebSocket.OPEN ? 'OPEN' : client.readyState;
                    console.log('  Broadcasting to client', client._remoteAddr || '<unknown>', 'state=', state);
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify({
                            type: 'sensor-reading',
                            esp32_id: msg.esp32_id,
                            wlValue: msg.wlValue,
                            wl_value: msg.wl_value ?? msg.wlValue
                        }));
                        sent++;
                    }
                } catch (e) {
                    console.warn('  Failed to send to client', client._remoteAddr || '<unknown>', e && e.message);
                }
            });
            console.log('  Broadcast complete, sent to', sent, 'clients');
        }
    });

    ws.on('close', (code, reason) => {
        let r = '';
        try { r = reason && reason.toString(); } catch (e) { r = '<unable to decode reason>'; }
        console.log('✗ WebSocket client disconnected', code, r);
    });

    ws.on('error', (err) => {
        console.error('WebSocket error on connection:', err && err.message);
    });
});

// ping clients periodically and terminate dead ones
const interval = setInterval(() => {
    global.wss.clients.forEach((ws) => {
        if (ws.isAlive === false) {
            console.log('Terminating dead WS client');
            return ws.terminate();
        }
        ws.isAlive = false;
        try { ws.ping(noop); } catch (e) { console.warn('Ping failed', e && e.message); }
    });
}, 30000);

global.wss.on('close', () => clearInterval(interval));

// Accept the configured origin plus any device on the local network (so a
// phone on the same Wi-Fi, hitting this computer's LAN IP instead of
// "localhost", isn't blocked by CORS during local development/demos).
const isLocalNetworkOrigin = (origin) => {
    try {
        const { hostname } = new URL(origin);
        return (
            hostname === 'localhost' ||
            hostname === '127.0.0.1' ||
            /^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
            /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
            /^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(hostname)
        );
    } catch {
        return false;
    }
};

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || origin === process.env.ALLOWED_ORIGIN || isLocalNetworkOrigin(origin)) {
            return callback(null, true);
        }
        callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    optionsSuccessStatus: 200
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use('/user', require('./routes/user'));

app.use('/esp32', require('./routes/esp32'));

// Dev-only open routes (mounted before JWT verification)
if (process.env.NODE_ENV !== 'production') {
    app.use('/dev-users', require('./routes/devUsers'));
}

app.use(verifyJWT);
app.use('/users', require('./routes/users'));
app.use('/notifications', require('./routes/notifications'));

app.get('*', (req, res) => { res.status(404).json({'message': "Not found"}) })

server.listen(PORT, "0.0.0.0", () => {
    console.log("\x1b[32m%s\x1b[0m", `App listening on port ${PORT}`);
})