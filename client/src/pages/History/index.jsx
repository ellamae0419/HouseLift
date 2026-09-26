import '../../assets/main.css';
import { useEffect, useState } from 'react';
import { setTitle, formatTimeAgo } from '../../utils/generalFunctions';
import useAxiosPrivate from '../../hooks/auth/useAxiosPrivate';

const ITEMS_PER_PAGE = 20;

export const History = () => {
    setTitle('Event History');
    const axiosPrivate = useAxiosPrivate();

    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                // Reads the same notifications feed as the Notifications page, but
                // through its own request rather than the shared context, so
                // viewing this page never marks anything read or resets the bell
                // badge/pagination the Notifications page relies on.
                const res = await axiosPrivate.get('/notifications', {
                    params: { page: 1, limit: ITEMS_PER_PAGE },
                });
                if (mounted) setEvents(res?.data?.data || []);
            } catch (err) {
                if (mounted) setError(err?.response?.data?.message || 'Failed to load event history.');
            } finally {
                if (mounted) setLoading(false);
            }
        })();
        return () => { mounted = false; };
    }, [axiosPrivate]);

    return (
        <>
            <h1 className='page-title'>Event history</h1>
            <p className="page-subtitle">A timeline of flood, lift and maintenance events for your pet house.</p>

            {loading && <p style={{ color: 'var(--hl-ink-tertiary)' }}>Loading event history...</p>}

            {!loading && error && <p style={{ color: 'var(--hl-danger)' }}>{error}</p>}

            {!loading && !error && events.length === 0 && (
                <p style={{ color: 'var(--hl-ink-tertiary)' }}>No events yet. Flood, lift and maintenance activity will show up here.</p>
            )}

            {!loading && !error && events.length > 0 && (
                <div style={{ background: 'var(--hl-card-bg)', border: '1px solid var(--hl-border)', borderRadius: '14px', overflow: 'hidden' }}>
                    {events.map((item, i) => (
                        <article
                            key={item.id}
                            style={{ padding: '16px 20px', borderTop: i === 0 ? 'none' : '1px solid var(--hl-border)' }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                                <strong style={{ color: 'var(--hl-ink)', fontFamily: 'var(--font-heading)', fontWeight: 600 }}>{item.title}</strong>
                                <span style={{ color: 'var(--hl-ink-tertiary)', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>{formatTimeAgo(item.createdAt)}</span>
                            </div>
                            <p style={{ margin: '6px 0 0', color: 'var(--hl-ink-secondary)' }}>{item.description}</p>
                        </article>
                    ))}
                </div>
            )}
        </>
    );
};

export default History;
