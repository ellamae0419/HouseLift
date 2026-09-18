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
            <h1 className='page-title'>Event History</h1>

            <div className="container" style={{ background: 'var(--background-card)', padding: '1rem' }}>
                <div className="stacked-list">
                    {events.map((item) => (
                        <article key={`${item.time}-${item.event}`} className="history-card" style={{ padding: '1rem', borderBottom: '1px solid var(--lines)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                                <strong style={{ color: 'var(--text)' }}>{item.event}</strong>
                                <span style={{ color: 'var(--text-muted)' }}>{item.time}</span>
                            </div>
                            <p style={{ margin: '0.5rem 0 0', color: 'var(--text-muted)' }}>{item.detail}</p>
                        </article>
                    ))}
                </div>
            </div>
        </>
    );
};

export default History;