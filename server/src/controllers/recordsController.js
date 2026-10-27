// A read-only look at every table, for admins. Each query names its columns by hand, so
// passwords, login tokens, reset codes, device keys, Wi-Fi passwords and ID photos can
// never be included, however the tables change later.
const LIMIT = 200;

// type: 'time' | 'yesno' | 'number' | 'mono' | undefined (plain text)
const TABLES = {
    users: {
        label: 'Users',
        from: 'users',
        sql: `SELECT u.username, u.fullName, u.email, u.roles, u.mobileNumber, u.address,
                     u.isVerified, u.isActivated, u.createdAt
              FROM users u ORDER BY u.createdAt DESC LIMIT ?`,
        columns: [
            { key: 'username', label: 'Username' },
            { key: 'fullName', label: 'Full name' },
            { key: 'email', label: 'Email' },
            { key: 'roles', label: 'Role' },
            { key: 'mobileNumber', label: 'Mobile' },
            { key: 'address', label: 'Address' },
            { key: 'isVerified', label: 'Approved', type: 'yesno' },
            { key: 'isActivated', label: 'Activated', type: 'yesno' },
            { key: 'createdAt', label: 'Created', type: 'time' },
        ],
    },
    devices: {
        label: 'Devices',
        from: 'esp32',
        sql: `SELECT e.esp32_id, u.username AS owner, (e.deviceSecret IS NOT NULL) AS hasKey,
                     e.lastSeenAt, e.createdAt
              FROM esp32 e LEFT JOIN users u ON u.id = e.userId
              ORDER BY e.id DESC LIMIT ?`,
        columns: [
            { key: 'esp32_id', label: 'Device', type: 'mono' },
            { key: 'owner', label: 'Owner' },
            { key: 'hasKey', label: 'Has device key', type: 'yesno' },
            { key: 'lastSeenAt', label: 'Last seen', type: 'time' },
            { key: 'createdAt', label: 'Created', type: 'time' },
        ],
    },
    orders: {
        label: 'Orders',
        from: 'orders',
        sql: `SELECT o.id, u.username, u.fullName, o.status, o.houseSize, v.idType, o.price, o.paidAt,
                     o.reviewedAt, o.rejectReason, o.createdAt
              FROM orders o
              JOIN users u ON u.id = o.userId
              LEFT JOIN id_verifications v ON v.orderId = o.id
              ORDER BY o.createdAt DESC, o.id DESC LIMIT ?`,
        columns: [
            { key: 'id', label: 'Order', type: 'number' },
            { key: 'username', label: 'Username' },
            { key: 'fullName', label: 'Full name' },
            { key: 'status', label: 'Status' },
            { key: 'houseSize', label: 'Size' },
            { key: 'idType', label: 'ID type' },
            { key: 'price', label: 'Price', type: 'number' },
            { key: 'paidAt', label: 'Paid', type: 'time' },
            { key: 'reviewedAt', label: 'ID checked', type: 'time' },
            { key: 'rejectReason', label: 'Reject reason' },
            { key: 'createdAt', label: 'Ordered', type: 'time' },
        ],
    },
    inquiries: {
        label: 'Inquiries',
        from: 'inquiries',
        sql: `SELECT id, fullName, mobileNumber, email, houseSize, message, status, createdAt
              FROM inquiries ORDER BY createdAt DESC, id DESC LIMIT ?`,
        columns: [
            { key: 'id', label: 'Inquiry', type: 'number' },
            { key: 'fullName', label: 'Full name' },
            { key: 'mobileNumber', label: 'Mobile' },
            { key: 'email', label: 'Email' },
            { key: 'houseSize', label: 'Size' },
            { key: 'message', label: 'Message' },
            { key: 'status', label: 'Status' },
            { key: 'createdAt', label: 'Sent', type: 'time' },
        ],
    },
    serials: {
        label: 'Serial codes',
        from: 'serial_codes',
        sql: `SELECT s.code, u.username, u.fullName, s.orderId, e.esp32_id AS deviceId,
                     s.status, s.issuedAt, s.redeemedAt
              FROM serial_codes s
              JOIN users u ON u.id = s.userId
              LEFT JOIN esp32 e ON e.id = s.esp32Id
              ORDER BY s.issuedAt DESC, s.id DESC LIMIT ?`,
        columns: [
            { key: 'code', label: 'Serial code', type: 'mono' },
            { key: 'username', label: 'Username' },
            { key: 'fullName', label: 'Full name' },
            { key: 'orderId', label: 'Order', type: 'number' },
            { key: 'deviceId', label: 'Device', type: 'mono' },
            { key: 'status', label: 'Status' },
            { key: 'issuedAt', label: 'Issued', type: 'time' },
            { key: 'redeemedAt', label: 'Used', type: 'time' },
        ],
    },
    alerts: {
        label: 'Alerts',
        from: 'notifications',
        sql: `SELECT n.id, u.username, n.title, n.description, n.isRead, n.createdAt
              FROM notifications n LEFT JOIN users u ON u.id = n.userId
              ORDER BY n.createdAt DESC, n.id DESC LIMIT ?`,
        columns: [
            { key: 'id', label: 'No.', type: 'number' },
            { key: 'username', label: 'For' },
            { key: 'title', label: 'Title' },
            { key: 'description', label: 'Message' },
            { key: 'isRead', label: 'Read', type: 'yesno' },
            { key: 'createdAt', label: 'Time', type: 'time' },
        ],
    },
    readings: {
        label: 'Water readings',
        from: 'sensor_readings',
        sql: `SELECT r.id, e.esp32_id AS deviceId, u.username AS owner, r.wlRaw, r.wlLevel,
                     r.isLifted, r.recordedAt
              FROM sensor_readings r
              JOIN esp32 e ON e.id = r.esp32Id
              LEFT JOIN users u ON u.id = e.userId
              ORDER BY r.recordedAt DESC, r.id DESC LIMIT ?`,
        columns: [
            { key: 'id', label: 'No.', type: 'number' },
            { key: 'deviceId', label: 'Device', type: 'mono' },
            { key: 'owner', label: 'Owner' },
            { key: 'wlRaw', label: 'Sensor value', type: 'number' },
            { key: 'wlLevel', label: 'Water level', type: 'number' },
            { key: 'isLifted', label: 'Lifted', type: 'yesno' },
            { key: 'recordedAt', label: 'Time', type: 'time' },
        ],
    },
    lifts: {
        label: 'Lifts',
        from: 'lift_events',
        sql: `SELECT l.id, e.esp32_id AS deviceId, u.username AS owner, l.direction,
                     l.\`trigger\` AS cause, l.startedAt, l.completedAt
              FROM lift_events l
              JOIN esp32 e ON e.id = l.esp32Id
              LEFT JOIN users u ON u.id = e.userId
              ORDER BY l.completedAt DESC, l.id DESC LIMIT ?`,
        columns: [
            { key: 'id', label: 'No.', type: 'number' },
            { key: 'deviceId', label: 'Device', type: 'mono' },
            { key: 'owner', label: 'Owner' },
            { key: 'direction', label: 'Direction' },
            { key: 'cause', label: 'Cause' },
            { key: 'startedAt', label: 'Started', type: 'time' },
            { key: 'completedAt', label: 'Finished', type: 'time' },
        ],
    },
};

const cell = (value, type) => {
    if (value === null || value === undefined) return null;
    // The driver returns BigInt for some numbers and strings for DECIMAL, and
    // res.json() refuses BigInt, so settle each type here.
    if (type === 'number') return Number(value);
    if (type === 'yesno') return Number(value) === 1 || value === true;
    return value;
};

// How many rows each table holds, for the tabs.
const listTables = async (req, res) => {
    try {
        const out = [];
        for (const [key, t] of Object.entries(TABLES)) {
            const rows = await global.db.query(`SELECT COUNT(*) AS n FROM \`${t.from}\``);
            out.push({ key, label: t.label, count: Number(rows[0].n) });
        }
        res.json(out);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

const getTable = async (req, res) => {
    const key = req.params.table;
    if (!Object.prototype.hasOwnProperty.call(TABLES, key)) return res.status(404).json({ message: 'No such table.' });
    const t = TABLES[key];

    try {
        const total = Number((await global.db.query(`SELECT COUNT(*) AS n FROM \`${t.from}\``))[0].n);
        const rows = await global.db.query(t.sql, [LIMIT]);
        res.json({
            key,
            label: t.label,
            columns: t.columns,
            total,
            limit: LIMIT,
            rows: rows.map((r) => Object.fromEntries(t.columns.map((c) => [c.key, cell(r[c.key], c.type)]))),
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

module.exports = { listTables, getTable };
