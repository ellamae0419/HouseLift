const { getOwnDevice, getDeviceByEsp32Id } = require('../utils/devices');

const isAdmin = (req) => Array.isArray(req.roles) && req.roles.includes('admin');

const RANGES = {
    '24h': { hours: 24, bucket: 'hour' },
    '7d': { hours: 24 * 7, bucket: 'day' },
    '30d': { hours: 24 * 30, bucket: 'day' },
};

const parseRange = (raw) => RANGES[raw] || RANGES['24h'];

// Regular users are always pinned to their own device. Admins may target one
// house with ?esp32_id=, or leave it out to see every house combined —
// which is why this can return null meaning "no device filter".
const resolveScope = async (req) => {
    if (isAdmin(req)) {
        if (!req.query.esp32_id) return { deviceId: null, all: true };
        const device = await getDeviceByEsp32Id(req.query.esp32_id);
        return { deviceId: device?.id ?? null, all: false, missing: !device };
    }

    const device = await getOwnDevice(req.username);
    return { deviceId: device?.id ?? null, all: false, missing: !device };
};

const waterLevel = async (req, res) => {
    const { hours, bucket } = parseRange(req.query.range);

    try {
        const scope = await resolveScope(req);
        if (scope.missing) return res.status(404).json({ message: 'No device found for this account' });

        // DATE_FORMAT truncates to the bucket so every reading in the same
        // hour (or day) collapses into one averaged point.
        const format = bucket === 'hour' ? '%Y-%m-%d %H:00:00' : '%Y-%m-%d';
        const where = scope.all ? '' : 'AND esp32Id = ?';
        const params = scope.all ? [hours] : [hours, scope.deviceId];

        const rows = await global.db.query(
            `SELECT DATE_FORMAT(recordedAt, '${format}') AS bucket,
                    ROUND(AVG(wlLevel), 2) AS avgLevel,
                    ROUND(MAX(wlLevel), 2) AS maxLevel,
                    COUNT(*) AS readings
             FROM sensor_readings
             WHERE recordedAt >= DATE_SUB(NOW(), INTERVAL ? HOUR) ${where}
             GROUP BY bucket
             ORDER BY bucket ASC`,
            params
        );

        res.json({
            range: req.query.range && RANGES[req.query.range] ? req.query.range : '24h',
            bucket,
            data: rows.map((r) => ({
                bucket: r.bucket,
                avgLevel: Number(r.avgLevel),
                maxLevel: Number(r.maxLevel),
                readings: Number(r.readings),
            })),
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// `trigger` is a MySQL reserved word — it stays backticked throughout.
const liftEvents = async (req, res) => {
    const { hours } = parseRange(req.query.range);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 200);

    try {
        const scope = await resolveScope(req);
        if (scope.missing) return res.status(404).json({ message: 'No device found for this account' });

        const where = scope.all ? '' : 'AND le.esp32Id = ?';
        const listParams = scope.all ? [hours, limit] : [hours, scope.deviceId, limit];
        const countParams = scope.all ? [hours] : [hours, scope.deviceId];

        const rows = await global.db.query(
            `SELECT le.id, le.direction, le.\`trigger\` AS trigger_, le.startedAt, le.completedAt,
                    TIMESTAMPDIFF(MICROSECOND, le.startedAt, le.completedAt) / 1000 AS durationMs,
                    e.esp32_id, u.username
             FROM lift_events le
             JOIN esp32 e ON e.id = le.esp32Id
             LEFT JOIN users u ON u.id = e.userId
             WHERE le.completedAt >= DATE_SUB(NOW(), INTERVAL ? HOUR) ${where}
             ORDER BY le.completedAt DESC
             LIMIT ?`,
            listParams
        );

        const breakdown = await global.db.query(
            `SELECT le.\`trigger\` AS trigger_, COUNT(*) AS total
             FROM lift_events le
             WHERE le.completedAt >= DATE_SUB(NOW(), INTERVAL ? HOUR) ${where}
             GROUP BY le.\`trigger\``,
            countParams
        );

        res.json({
            range: req.query.range && RANGES[req.query.range] ? req.query.range : '24h',
            data: rows.map((r) => ({
                id: String(r.id),
                direction: r.direction,
                trigger: r.trigger_,
                startedAt: r.startedAt,
                completedAt: r.completedAt,
                durationMs: Number(r.durationMs),
                esp32_id: r.esp32_id,
                username: r.username,
            })),
            breakdown: breakdown.reduce((acc, r) => ({ ...acc, [r.trigger_]: Number(r.total) }), {}),
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

const summary = async (req, res) => {
    try {
        const scope = await resolveScope(req);
        if (scope.missing) return res.status(404).json({ message: 'No device found for this account' });

        const liftWhere = scope.all ? '' : 'AND esp32Id = ?';
        const readWhere = scope.all ? '' : 'AND esp32Id = ?';
        const liftParams = scope.all ? [] : [scope.deviceId];
        const readParams = scope.all ? [] : [scope.deviceId];

        const lifts = await global.db.query(
            `SELECT COUNT(*) AS total,
                    SUM(CASE WHEN \`trigger\` = 'auto' THEN 1 ELSE 0 END) AS automatic
             FROM lift_events
             WHERE completedAt >= DATE_SUB(NOW(), INTERVAL 7 DAY) ${liftWhere}`,
            liftParams
        );

        const levels = await global.db.query(
            `SELECT ROUND(AVG(wlLevel), 2) AS avgLevel, ROUND(MAX(wlLevel), 2) AS maxLevel, COUNT(*) AS readings
             FROM sensor_readings
             WHERE recordedAt >= DATE_SUB(NOW(), INTERVAL 24 HOUR) ${readWhere}`,
            readParams
        );

        // A simple stand-in for uptime: the longest stretch in the last day
        // where no reading arrived at all.
        const gapRows = await global.db.query(
            `SELECT MAX(gap) AS longestGapSeconds FROM (
                SELECT TIMESTAMPDIFF(SECOND, LAG(recordedAt) OVER (ORDER BY recordedAt), recordedAt) AS gap
                FROM sensor_readings
                WHERE recordedAt >= DATE_SUB(NOW(), INTERVAL 24 HOUR) ${readWhere}
             ) g`,
            readParams
        );

        res.json({
            liftsThisWeek: Number(lifts?.[0]?.total || 0),
            automaticLifts: Number(lifts?.[0]?.automatic || 0),
            avgLevel24h: levels?.[0]?.avgLevel != null ? Number(levels[0].avgLevel) : null,
            maxLevel24h: levels?.[0]?.maxLevel != null ? Number(levels[0].maxLevel) : null,
            readings24h: Number(levels?.[0]?.readings || 0),
            longestGapSeconds: gapRows?.[0]?.longestGapSeconds != null ? Number(gapRows[0].longestGapSeconds) : null,
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

module.exports = { waterLevel, liftEvents, summary };
