const { getOwnDevice, getDeviceByEsp32Id, setDeviceThreshold } = require('../utils/devices');

const isAdmin = (req) => Array.isArray(req.roles) && req.roles.includes('admin');

// Admins can target any house via ?esp32_id=; everyone else is always
// limited to their own device, no matter what's in the query string.
const resolveDevice = async (req) => {
    if (isAdmin(req) && req.query.esp32_id) {
        return getDeviceByEsp32Id(req.query.esp32_id);
    }
    return getOwnDevice(req.username);
};

const getThreshold = async (req, res) => {
    try {
        const device = await resolveDevice(req);
        if (!device) return res.status(404).json({ message: 'No device found for this account' });
        res.json({ threshold: device.threshold });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

const putThreshold = async (req, res) => {
    const { threshold } = req.body;
    if (threshold === undefined || threshold < 0 || threshold > 4) {
        return res.status(400).json({ message: 'Threshold must be between 0 and 4' });
    }

    try {
        const device = await resolveDevice(req);
        if (!device) return res.status(404).json({ message: 'No device found for this account' });

        await setDeviceThreshold(device, threshold);
        res.json({ success: 'Threshold updated', threshold });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

const postLift = async (req, res) => {
    try {
        const device = await resolveDevice(req);
        if (!device) return res.status(404).json({ message: 'No device found for this account' });

        const sent = typeof global.sendToDeviceSocket === 'function'
            ? global.sendToDeviceSocket(device.esp32_id, { type: 'lift-command', esp32_id: device.esp32_id })
            : false;

        if (!sent) return res.status(409).json({ message: 'Device offline' });

        res.json({ message: 'Lift command sent' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

const getStatus = async (req, res) => {
    try {
        const device = await resolveDevice(req);
        if (!device) return res.status(404).json({ message: 'No device found for this account' });

        const lastSeenAt = device.lastSeenAt;
        const online = !!lastSeenAt && (Date.now() - new Date(lastSeenAt).getTime()) < 30000;

        res.json({ online, lastSeenAt });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

module.exports = { getThreshold, putThreshold, postLift, getStatus };
