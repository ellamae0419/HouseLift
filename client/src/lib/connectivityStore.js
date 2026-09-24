// Minimal external store (no extra deps) so the axios layer — which lives
// outside the React tree — can flag "server unreachable" and any component
// can subscribe to it via useSyncExternalStore.
let unreachable = false;
const listeners = new Set();

export function setServerUnreachable(value) {
    if (unreachable === value) return;
    unreachable = value;
    listeners.forEach((listener) => listener());
}

export function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

export function getSnapshot() {
    return unreachable;
}
