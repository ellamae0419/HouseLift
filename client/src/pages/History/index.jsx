import '../../assets/main.css';
import { setTitle } from '../../utils/generalFunctions';

const events = [
    { time: '2 min ago', event: 'Water level changed', detail: 'Zone A rose to 2.4 cm' },
    { time: '18 min ago', event: 'Safety control adjusted', detail: 'Auto lift threshold updated' },
    { time: '1 hour ago', event: 'Maintenance logged', detail: 'Lift inspection completed' },
    { time: 'Yesterday', event: 'Notification sent', detail: 'High water alert delivered' },
];

export const History = () => {
    setTitle('Event History');

    return (
        <>
            <h1 className='page-title'>Event history</h1>
            <p className="page-subtitle">A timeline of flood, lift and maintenance events for your pet house.</p>

            <div style={{ background: 'var(--hl-card-bg)', border: '1px solid var(--hl-border)', borderRadius: '14px', overflow: 'hidden' }}>
                {events.map((item, i) => (
                    <article
                        key={`${item.time}-${item.event}`}
                        style={{ padding: '16px 20px', borderTop: i === 0 ? 'none' : '1px solid var(--hl-border)' }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                            <strong style={{ color: 'var(--hl-ink)', fontFamily: 'var(--font-heading)', fontWeight: 600 }}>{item.event}</strong>
                            <span style={{ color: 'var(--hl-ink-tertiary)', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>{item.time}</span>
                        </div>
                        <p style={{ margin: '6px 0 0', color: 'var(--hl-ink-secondary)' }}>{item.detail}</p>
                    </article>
                ))}
            </div>
        </>
    );
};

export default History;
