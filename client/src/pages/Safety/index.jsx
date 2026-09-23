import '../../assets/main.css'
import { useEffect, useState } from 'react';
import { setTitle } from '../../utils/generalFunctions';
import { DataCard } from '../../components/Datacard/index';
import useServerSocket from '../../hooks/useServerSocket';
import useAxiosPrivate from '../../hooks/auth/useAxiosPrivate';

const MAX_LEVEL_CM = 4;

export const HouseMonitoring = () => {
    setTitle("Flood Monitoring");
    const { wlValue, connected } = useServerSocket();
    const axiosPrivate = useAxiosPrivate();
    const [threshold, setThreshold] = useState(null);

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const res = await axiosPrivate.post('/esp32/config', { esp32_id: 'esp32-default' });
                const t = Number(res?.data?.threshold);
                if (mounted && !Number.isNaN(t)) setThreshold(t);
            } catch (err) {
                console.error('Error loading flood threshold:', err?.response?.data?.message || err.message);
            }
        })();
        return () => { mounted = false; };
    }, [axiosPrivate]);

    const waterLevel = wlValue ?? 0;
    const lifted = threshold != null && waterLevel >= threshold;
    const fillPercent = Math.max(0, Math.min(100, Math.round((waterLevel / MAX_LEVEL_CM) * 100)));

    return (
        <>
            <h1 className='page-title'>Flood monitoring</h1>
            <p className="page-subtitle">Live water level and lift status for the connected pet house.</p>

            <div className="hl-page-stack">
                <div className="hl-kpi-grid">
                    <div className="hl-card-shell hl-gauge-card">
                        <div className="hl-gauge-card__title">Water level</div>
                        <div className="hl-gauge-card__row">
                            <div className="hl-gauge-card__tube">
                                <div className="hl-gauge-card__fill" style={{ height: `${fillPercent}%` }} />
                            </div>
                            <div className="hl-gauge-card__ticks">
                                <span>{MAX_LEVEL_CM} cm</span>
                                <span>0 cm</span>
                            </div>
                        </div>
                        <div className="hl-gauge-card__pct">{waterLevel} cm</div>
                    </div>

                    <DataCard
                        title="Lift status"
                        value={lifted ? 'Lifted' : 'Normal'}
                        footer={threshold != null ? `Triggers at ${threshold} cm` : 'Threshold not set — adjust in Settings'}
                        variant={lifted ? 'amber' : 'green'}
                    />

                    <DataCard
                        title="Live monitoring"
                        footer={connected ? 'Sensor feed connected' : 'Waiting for device'}
                        variant="blue"
                        main={
                            <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '28px', color: connected ? 'var(--hl-accent)' : 'var(--hl-danger)' }}>
                                {connected ? 'Online' : 'Offline'}
                            </div>
                        }
                    />
                </div>
            </div>
        </>
    );
}

export default HouseMonitoring;
