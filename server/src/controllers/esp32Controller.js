// Device-only route, protected by verifyDeviceKey. Returns just the
// threshold — the device is already on WiFi by the time it can ask, so it
// never needs wifi_ssid/wifi_pass, and not sending them closes the
// plaintext-password exposure for good.
const esp32Controller = async (req, res) => {
    const esp32Id = req.body?.esp32_id;

    try {
        const result = await global.db.query(
            'SELECT threshold FROM esp32 WHERE esp32_id = ?',
            [esp32Id]
        );

        if (!result[0]) {
            return res.status(404).json({ message: 'ESP32 not found' });
        }

        res.json({ threshold: result[0].threshold });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

module.exports = { esp32Controller };
