// The login token only carries username and roles (verifyJWT.js), not a user
// id, so every "this user's own device" lookup has to go through username first.
const getOwnDevice = async (username) => {
    const userRows = await global.db.query('SELECT id FROM users WHERE username = ?', [username]);
    if (!userRows[0]) return null;

    const deviceRows = await global.db.query('SELECT * FROM esp32 WHERE userId = ?', [userRows[0].id]);
    return deviceRows[0] || null;
};

const getDeviceByEsp32Id = async (esp32Id) => {
    const rows = await global.db.query('SELECT * FROM esp32 WHERE esp32_id = ?', [esp32Id]);
    return rows[0] || null;
};

// Shared by the regular-user and admin threshold routes so the write + live
// push only lives in one place.
const setDeviceThreshold = async (device, threshold) => {
    await global.db.query('UPDATE esp32 SET threshold = ? WHERE esp32_id = ?', [threshold, device.esp32_id]);

    const payload = { type: 'threshold-update', esp32_id: device.esp32_id, threshold };
    if (typeof global.sendToDeviceSocket === 'function') global.sendToDeviceSocket(device.esp32_id, payload);
    if (typeof global.broadcastToDeviceAudience === 'function') global.broadcastToDeviceAudience(device.esp32_id, payload);
};

module.exports = { getOwnDevice, getDeviceByEsp32Id, setDeviceThreshold };
