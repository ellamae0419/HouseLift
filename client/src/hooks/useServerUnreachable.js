import { useSyncExternalStore } from 'react';
import { subscribe, getSnapshot } from '../lib/connectivityStore';

export default function useServerUnreachable() {
    return useSyncExternalStore(subscribe, getSnapshot);
}
