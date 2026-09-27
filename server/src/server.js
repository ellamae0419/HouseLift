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
const jwt = require('jsonwebtoken');
const verifyJWT = require('./middlewares/verifyJWT');
const { getOwnDevice, getDeviceByEsp32Id, saveSensorReading, saveLiftEvent, normalizeTrigger } = require('./utils/devices');
const WebSocket = require('ws');
const http = require('http');
console.log("\x1b[36m%s\x1b[0m", `Starting the server side...\n`);

const app = express();
const server = http.createServer(app);

// Railway sits in front of this app as a single reverse-proxy hop; without
// this, express-rate-limit (and req.ip generally) sees Railway's proxy IP
// for every request instead of the real client IP, so one visitor's limit
// would be shared by everyone.
app.set('trust proxy', 1);

// fallback port when PORT not provided in env
const PORT = process.env.PORT || 3001;

global.wss = new WebSocket.Server({ server });

// heartbeat to detect and clean up dead clients
function noop() {}
function heartbeat() { this.isAlive = true; }

// Sends to every logged-in viewer socket that's allowed to see this device:
// its owner, plus every admin. Never sent to other regular users' houses.
function broadcastToDeviceAudience(esp32Id, payload) {
    const json = JSON.stringify(payload);
    global.wss.clients.forEach((client) => {
        if (client.readyState !== WebSocket.OPEN) return;
        if (client._role !== 'viewer') return;
        const isOwner = client._ownEsp32Id === esp32Id;
        const isAdmin = Array.isArray(client._roles) && client._roles.includes('admin');
        if (isOwner || isAdmin) {
            try { client.send(json); } catch (e) { console.warn('[WS] Failed to send to viewer:', e && e.message); }
        }
    });
}
global.broadcastToDeviceAudience = broadcastToDeviceAudience;

// Sends to the one device socket for this esp32_id, if it's currently
// connected. Returns whether it found one, so callers (like the remote lift
// route) can report "device offline" instead of silently doing nothing.
function sendToDeviceSocket(esp32Id, payload) {
    const json = JSON.stringify(payload);
    let sent = false;
    global.wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN && client._role === 'device' && client._esp32Id === esp32Id) {
            try { client.send(json); sent = true; } catch (e) { console.warn('[WS] Failed to send to device:', e && e.message); }
        }
    });
    return sent;
}
global.sendToDeviceSocket = sendToDeviceSocket;

global.wss.on('connection', async (ws, req) => {
    ws.isAlive = true;
    ws.on('pong', heartbeat);

    const remoteAddr = req.socket.remoteAddress || 'unknown';
    ws._remoteAddr = remoteAddr;

    // Two ways in: a device proves itself with its stored secret, a browser
    // with its normal login token. Anything else is closed immediately —
    // this is the socket-level equivalent of verifyDeviceKey/verifyJWT.
    const deviceId = req.headers['x-device-id'];
    const deviceKey = req.headers['x-device-key'];
    let authenticated = false;

    if (deviceId && deviceKey) {
        try {
            const rows = await global.db.query('SELECT esp32_id, deviceSecret FROM esp32 WHERE esp32_id = ?', [deviceId]);
            const device = rows[0];
            if (device && device.deviceSecret && device.deviceSecret === deviceKey) {
                ws._role = 'device';
                ws._esp32Id = device.esp32_id;
                authenticated = true;
            }
        } catch (err) {
            console.log('[WS] Device auth lookup failed:', err.message);
        }
    } else {
        let token = null;
        try {
            token = new URL(req.url, 'http://localhost').searchParams.get('token');
        } catch (err) { /* leave token null */ }

        if (token) {
            try {
                const decoded = jwt.verify(token, process.env.ACCESSTOKEN_SECRET);
                ws._role = 'viewer';
                ws._username = decoded.user.username;
                ws._roles = decoded.user.roles || [];
                authenticated = true;

                if (!ws._roles.includes('admin')) {
                    const device = await getOwnDevice(ws._username);
                    ws._ownEsp32Id = device ? device.esp32_id : null;
                }
            } catch (err) {
                // expired/invalid token — falls through to the reject below
            }
        }
    }

    if (!authenticated) {
        console.log('✗ WS connection rejected — no valid device key or login token', remoteAddr);
        ws.close(1008, 'Unauthorized');
        return;
    }

    if (ws._role === 'device') {
        console.log('✓ Device socket connected:', ws._esp32Id, remoteAddr);
        broadcastToDeviceAudience(ws._esp32Id, { type: 'device-status', esp32_id: ws._esp32Id, online: true });
    } else {
        console.log('✓ Browser socket connected:', ws._username, remoteAddr);
    }

    ws.on('message', async (message) => {
        let msg;
        try {
            msg = JSON.parse(message.toString());
        } catch (err) {
            console.log('Invalid WS message received from', ws._remoteAddr, err.message);
            return;
        }

        if (msg && msg.type === 'sensor-reading') {
            // Only a verified device socket may report a reading, and only
            // under its own verified esp32_id — never whatever the message
            // body claims, so a compromised browser session can't spoof one.
            if (ws._role !== 'device') {
                console.log('[WS] Ignored sensor-reading from a non-device socket', ws._remoteAddr);
                return;
            }

            const esp32Id = ws._esp32Id;
            try {
                await global.db.query('UPDATE esp32 SET lastSeenAt = NOW() WHERE esp32_id = ?', [esp32Id]);
            } catch (err) {
                console.log('[WS] Failed to update lastSeenAt:', err.message);
            }

            // Saved at most once a minute; the broadcast below still goes out
            // at full rate so the live dashboard stays smooth.
            try {
                const device = await getDeviceByEsp32Id(esp32Id);
                if (device) {
                    await saveSensorReading(device, {
                        wlRaw: msg.wlValue,
                        wlLevel: msg.wl_value ?? msg.wlValue,
                        isLifted: msg.isLifted,
                    });
                }
            } catch (err) {
                console.log('[WS] Failed to save sensor reading:', err.message);
            }

            broadcastToDeviceAudience(esp32Id, {
                type: 'sensor-reading',
                esp32_id: esp32Id,
                wlValue: msg.wlValue,
                wl_value: msg.wl_value ?? msg.wlValue
            });
        }
        else if (msg && msg.type === 'lift-status') {
            if (ws._role !== 'device') {
                console.log('[WS] Ignored lift-status from a non-device socket', ws._remoteAddr);
                return;
            }

            const esp32Id = ws._esp32Id;
            const direction = msg.direction === 'retract' ? 'retract' : 'lift';
            const trigger = normalizeTrigger(msg.trigger);

            try {
                const device = await getDeviceByEsp32Id(esp32Id);
                if (device) {
                    await saveLiftEvent(device, { direction, trigger, durationMs: msg.durationMs });

                    // The Notifications page has always promised flood alerts
                    // but nothing ever created one. An automatic lift is
                    // exactly that event.
                    if (trigger === 'auto' && direction === 'lift' && device.userId) {
                        await global.db.query(
                            'INSERT INTO notifications (title, description, isRead, userId) VALUES (?, ?, 0, ?)',
                            ['Flood detected', 'Water reached the flood threshold — the platform was raised automatically.', device.userId]
                        );
                    }
                }
            } catch (err) {
                console.log('[WS] Failed to save lift event:', err.message);
            }

            broadcastToDeviceAudience(esp32Id, {
                type: 'lift-status',
                esp32_id: esp32Id,
                isLifted: msg.isLifted,
                direction,
                trigger,
            });
        }
    });

    ws.on('close', (code, reason) => {
        let r = '';
        try { r = reason && reason.toString(); } catch (e) { r = '<unable to decode reason>'; }
        console.log('✗ WebSocket client disconnected', code, r, ws._role || 'unauthenticated');

        if (ws._role === 'device') {
            broadcastToDeviceAudience(ws._esp32Id, { type: 'device-status', esp32_id: ws._esp32Id, online: false });
        }
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
app.use('/reports', require('./routes/reports'));

app.get('*', (req, res) => { res.status(404).json({'message': "Not found"}) })

server.listen(PORT, "0.0.0.0", () => {
    console.log("\x1b[32m%s\x1b[0m", `App listening on port ${PORT}`);
})