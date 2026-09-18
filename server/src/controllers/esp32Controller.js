const esp32Controller = async (req, res) => {
    const esp32Id = req.body?.esp32_id || 'esp32-default';

    try {
        const result = await global.db.query(
            'SELECT threshold, wifi_ssid, wifi_pass FROM esp32 WHERE esp32_id = ?',
            [esp32Id]
        );

        if (!result[0]) {
            return res.status(404).json({ message: 'ESP32 not found' });
        }

        res.json({
            threshold: result[0].threshold,
            wifi_ssid: result[0].wifi_ssid,
            wifi_pass: result[0].wifi_pass
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

const updateThreshold = async (req, res) => {
    const { esp32_id, threshold } = req.body;

    if (threshold === undefined || threshold < 0 || threshold > 4) {
        return res.status(400).json({ message: 'Threshold must be between 0 and 4' });
    }

    try {
        await global.db.query(
            'UPDATE esp32 SET threshold = ? WHERE esp32_id = ?',
            [threshold, esp32_id || 'esp32-default']
        );

        if (global.wss) {
            global.wss.clients.forEach((client) => {
                if (client.readyState === 1) {
                    client.send(JSON.stringify({
                        type: 'threshold-update',
                        esp32_id: esp32_id || 'esp32-default',
                        threshold: threshold
                    }));
                }
            });
        }

        res.json({ success: 'Threshold updated', threshold });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

module.exports = { esp32Controller, updateThreshold };
