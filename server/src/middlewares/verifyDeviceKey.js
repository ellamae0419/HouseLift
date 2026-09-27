// Protects device-only routes (the ESP32's own calls), separate from
// verifyJWT which protects logged-in-browser routes. Compares the caller's
// X-Device-Key header against the secret stored for that esp32_id.
const verifyDeviceKey = async (req, res, next) => {
    const esp32Id = req.body?.esp32_id;
    const deviceKey = req.headers['x-device-key'];

    if (!esp32Id || !deviceKey) return res.sendStatus(401);

    try {
        const rows = await global.db.query('SELECT deviceSecret FROM esp32 WHERE esp32_id = ?', [esp32Id]);
        const device = rows[0];

        if (!device || !device.deviceSecret || device.deviceSecret !== deviceKey) {
            return res.sendStatus(401);
        }

        next();
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

module.exports = verifyDeviceKey;
