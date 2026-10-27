const { createAlert } = require('./alerts');

// The alerts a house owner gets, following the stages in the Flood-Adaptive Pethouse design (Rev D):
//   warning    Stage 1  the water reached the warning level and the platform lifted
//   floating   Stage 2  the water is still rising and the house is riding it
//   critical   Stage 3  the water is at the critical level: retrieve the pet, repeated every 5 minutes
//   all-clear  Recovery the water went down and the platform was lowered
//   fault      Fault    the unit reported a problem (sensors disagree, a lift timed out, ...)
//   battery-low         the unit's battery is low
//   heartbeat           the daily "I am alive" check (dashboard only, never texted)
// The server works out warning, critical and all-clear from what the unit already reports. The
// others arrive as a "device-alert" message from the firmware (see docs/alerts.md).

const MINUTE = 60 * 1000;

// The critical level on the sensor's 0 to 4 scale. The design raises the critical alarm well above
// the warning level, where the platform has used all its lift and the owner must act.
const criticalLevel = () => {
    const level = Number(process.env.CRITICAL_WATER_LEVEL);
    return level > 0 && level <= 4 ? level : 3.5;
};
// The design repeats the critical alert every 5 minutes while the water stays that high.
const criticalRepeatMs = () => {
    const minutes = Number(process.env.CRITICAL_REPEAT_MINUTES);
    return (minutes > 0 ? minutes : 5) * MINUTE;
};

const KINDS = {
    warning: {
        title: 'Flood warning',
        description: () => 'Water reached the warning level. The platform was raised automatically.',
        sms: () => (name) => `HydroLift WARNING: Hi ${name}, water has reached the warning level at your house. Your platform was raised automatically.`,
        dedupeMs: 10 * MINUTE,
    },
    floating: {
        title: 'House is floating',
        description: () => 'The water is still rising and your house is riding on it. It is protected for now.',
        sms: () => (name) => `HydroLift: Hi ${name}, the water at your house is still rising and your house is floating on it. It is protected for now. Please stay alert.`,
        dedupeMs: 10 * MINUTE,
    },
    critical: {
        title: 'CRITICAL flood level',
        description: () => 'Floodwater is at the critical level. Move your pet to safety now.',
        sms: () => (name) => `HydroLift CRITICAL: Hi ${name}, floodwater at your house is at the critical level. Please get your pet to safety now.`,
        dedupeMs: () => criticalRepeatMs(),
        cooldownMs: () => criticalRepeatMs(),
    },
    'all-clear': {
        title: 'All clear',
        description: () => 'The water has gone down and the platform was lowered.',
        sms: () => (name) => `HydroLift: ALL CLEAR. Hi ${name}, the water at your house has gone down and your platform was lowered.`,
        dedupeMs: 10 * MINUTE,
    },
    fault: {
        title: 'Unit fault',
        description: (detail) => `Your HydroLift reported a problem${detail ? `: ${detail}` : ''}. Please check the unit.`,
        sms: (detail) => (name) => `HydroLift FAULT: Hi ${name}, your unit reported a problem${detail ? ` (${detail})` : ''}. Please check it.`,
        dedupeMs: 30 * MINUTE,
    },
    'battery-low': {
        title: 'Battery low',
        description: () => 'The battery in your HydroLift is low. Please charge or replace it.',
        sms: () => (name) => `HydroLift: Hi ${name}, the battery in your unit is low. Please charge or replace it so it can keep protecting your pet.`,
        dedupeMs: 6 * 60 * MINUTE,
    },
    heartbeat: {
        title: 'HydroLift is online',
        description: () => 'Daily check: your unit is working and connected.',
        sms: null,                       // shown on the dashboard only; a daily text would cost the phone's load for nothing
        dedupeMs: 12 * 60 * MINUTE,
    },
};

const ALERT_KINDS = Object.keys(KINDS);
const value = (v) => (typeof v === 'function' ? v() : v);

// Raises one alert for the owner of this device. A device nobody owns has nobody to tell.
const raiseAlert = async ({ device, kind, detail = '' }) => {
    const def = KINDS[kind];
    if (!def || !device || !device.userId) return null;

    const cleanDetail = String(detail || '').replace(/[^\w .,:;()%/+-]/g, '').trim().slice(0, 100);
    return createAlert({
        userId: device.userId,
        title: def.title,
        description: def.description(cleanDetail),
        sms: def.sms !== null,
        smsText: def.sms ? def.sms(cleanDetail) : undefined,
        key: kind,
        cooldownMs: value(def.cooldownMs),
        dedupeMs: value(def.dedupeMs),
    });
};

// The next time each device may raise a critical alert. Cleared when its water drops back below the
// critical level, so the next time it rises that high the owner is told straight away.
const nextCriticalAt = new Map();

// Called for every reading the unit sends (about every 2 seconds), so it must be cheap.
const onReading = async (device, level) => {
    const reading = Number(level);
    if (!device || !Number.isFinite(reading) || reading > 4) return;

    // 0.2 below the critical level, so a reading wobbling around it doesn't reset the repeat timer.
    if (reading < criticalLevel() - 0.2) {
        nextCriticalAt.delete(device.esp32_id);
        return;
    }
    if (reading < criticalLevel()) return;

    if (Date.now() < (nextCriticalAt.get(device.esp32_id) || 0)) return;
    nextCriticalAt.set(device.esp32_id, Date.now() + criticalRepeatMs());
    await raiseAlert({ device, kind: 'critical' });
};

// Called when the unit reports a lift or a lowering. Only the unit's own automatic moves are alerts:
// a hand or phone lift is the owner's doing, so they already know.
const onLift = async (device, { direction, trigger }) => {
    if (!device || trigger !== 'auto') return;

    if (direction === 'lift') {
        await raiseAlert({ device, kind: 'warning' });
        return;
    }

    // Lowered by itself: tell the owner it is over, but only if there was a flood to be over.
    nextCriticalAt.delete(device.esp32_id);
    const recent = await global.db.query(
        "SELECT id FROM notifications WHERE userId = ? AND title = ? AND createdAt > DATE_SUB(NOW(), INTERVAL 24 HOUR) LIMIT 1",
        [device.userId, KINDS.warning.title]
    );
    if (recent[0]) await raiseAlert({ device, kind: 'all-clear' });
};

module.exports = { ALERT_KINDS, KINDS, raiseAlert, onReading, onLift };
