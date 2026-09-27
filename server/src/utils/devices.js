// The login token only carries username and roles (verifyJWT.js), not a user
// id, so anything scoped to "this user" has to go through username first.
const getUserIdByUsername = async (username) => {
    const rows = await global.db.query('SELECT id FROM users WHERE username = ?', [username]);
    return rows[0]?.id || null;
};

const getOwnDevice = async (username) => {
    const userId = await getUserIdByUsername(username);
    if (!userId) return null;

    const deviceRows = await global.db.query('SELECT * FROM esp32 WHERE userId = ?', [userId]);
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

// The firmware sends a reading every ~2 seconds. Saving all of them would
// add ~43k rows per device per day for no analytical benefit, so the live
// broadcast stays at full rate while only one reading a minute is kept.
const SAVE_READING_EVERY_MS = 60 * 1000;
const lastSavedReadingAt = new Map();

const saveSensorReading = async (device, { wlRaw, wlLevel, isLifted }) => {
    const previous = lastSavedReadingAt.get(device.esp32_id) || 0;
    if (Date.now() - previous < SAVE_READING_EVERY_MS) return false;
    lastSavedReadingAt.set(device.esp32_id, Date.now());

    await global.db.query(
        'INSERT INTO sensor_readings (esp32Id, wlRaw, wlLevel, isLifted) VALUES (?, ?, ?, ?)',
        [device.id, Math.round(Number(wlRaw) || 0), Number(wlLevel) || 0, isLifted ? 1 : 0]
    );
    return true;
};

// `trigger` is a MySQL reserved word, so it stays backticked everywhere.
const saveLiftEvent = async (device, { direction, trigger, durationMs }) => {
    const duration = Math.max(Number(durationMs) || 0, 0);
    // NOW(3) keeps the millisecond part; plain NOW() would round it away and
    // make every lift look like it took a whole number of seconds.
    await global.db.query(
        'INSERT INTO lift_events (esp32Id, direction, `trigger`, startedAt, completedAt) ' +
            'VALUES (?, ?, ?, DATE_SUB(NOW(3), INTERVAL ? MICROSECOND), NOW(3))',
        [device.id, direction === 'retract' ? 'retract' : 'lift', normalizeTrigger(trigger), duration * 1000]
    );
};

const normalizeTrigger = (trigger) => {
    const allowed = ['auto', 'manual', 'remote'];
    return allowed.includes(trigger) ? trigger : 'manual';
};

module.exports = {
    getUserIdByUsername,
    getOwnDevice,
    getDeviceByEsp32Id,
    setDeviceThreshold,
    saveSensorReading,
    saveLiftEvent,
    normalizeTrigger,
};
