// The three levels shown to owners and admins. They follow the same numbers the alerts use:
//   Safe     the water is below the trigger level
//   Caution  the water reached the trigger level (the platform lifts by itself)
//   Danger   the water reached the critical level (the owner must act: move the pet to safety)
// The server sends the critical level; 3.5 is its default, used until the page has heard from it.
export const DEFAULT_CRITICAL_CM = 3.5;

export const getWaterLevel = (waterLevel, threshold, critical = DEFAULT_CRITICAL_CM) => {
    if (waterLevel == null || Number.isNaN(Number(waterLevel))) return null;
    const cm = Number(waterLevel);
    const criticalCm = Number(critical) > 0 ? Number(critical) : DEFAULT_CRITICAL_CM;
    if (cm >= criticalCm) return 'danger';
    if (threshold != null && cm >= Number(threshold)) return 'caution';
    return 'safe';
};

export const LEVEL_TEXT = {
    safe: { label: 'Safe', title: 'Safe', detail: 'Platform lowered, resting on ground' },
    caution: { label: 'Caution', title: 'Caution: water is rising', detail: 'Platform raised automatically' },
    danger: { label: 'Danger', title: 'Danger: critical flood level', detail: 'Move your pet to safety now' },
};
