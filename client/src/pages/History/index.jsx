import '../../assets/main.css';
import { useCallback, useEffect, useRef, useState } from 'react';
import { setTitle, formatTimeAgo } from '../../utils/generalFunctions';
import useAxiosPrivate from '../../hooks/auth/useAxiosPrivate';

const ITEMS_PER_PAGE = 20;

export const History = () => {
    setTitle('Event History');
    const axiosPrivate = useAxiosPrivate();

    const [events, setEvents] = useState([]);
    const [page, setPage] = useState(1);
    const [pageCount, setPageCount] = useState(1);
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState('');

    // Bumped on every request (and on unmount) so a slow response for an old
    // date range can never overwrite the list for the current one.
    const requestRef = useRef(0);

    // Reads the same notifications feed as the Notifications page, but through
    // its own request rather than the shared context, so viewing this page
    // never marks anything read or resets the bell badge/pagination the
    // Notifications page relies on.
    const fetchPage = useCallback(async (pageNumber) => {
        const res = await axiosPrivate.get('/notifications', {
            params: {
                page: pageNumber,
                limit: ITEMS_PER_PAGE,
                from: from || undefined,
                to: to || undefined,
            },
        });
        return res?.data || {};
    }, [axiosPrivate, from, to]);

    useEffect(() => {
        const requestId = ++requestRef.current;
        (async () => {
            setLoading(true);
            setError('');
            try {
                const body = await fetchPage(1);
                if (requestId !== requestRef.current) return;
                setEvents(body.data || []);
                setPage(1);
                setPageCount(body.pagination?.pageCount || 1);
            } catch (err) {
                if (requestId === requestRef.current) {
                    setError(err?.response?.data?.message || 'Failed to load event history.');
                }
            } finally {
                if (requestId === requestRef.current) setLoading(false);
            }
        })();
    }, [fetchPage]);

    useEffect(() => () => { requestRef.current += 1; }, []);

    const loadMore = async () => {
        const requestId = ++requestRef.current;
        setLoadingMore(true);
        try {
            const body = await fetchPage(page + 1);
            if (requestId !== requestRef.current) return;
            setEvents((current) => [...current, ...(body.data || [])]);
            setPage(page + 1);
            setPageCount(body.pagination?.pageCount || page + 1);
        } catch (err) {
            if (requestId === requestRef.current) {
                setError(err?.response?.data?.message || 'Failed to load more events.');
            }
        } finally {
            setLoadingMore(false);
        }
    };

    const filtered = Boolean(from || to);

    return (
        <>
            <h1 className='page-title'>Event history</h1>
            <p className="page-subtitle">A timeline of flood, lift and maintenance events for your pet house.</p>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '18px' }}>
                <label style={labelStyle}>
                    From
                    <input
                        type="date"
                        value={from}
                        max={to || undefined}
                        onChange={(e) => setFrom(e.target.value)}
                        style={inputStyle}
                    />
                </label>
                <label style={labelStyle}>
                    To
                    <input
                        type="date"
                        value={to}
                        min={from || undefined}
                        onChange={(e) => setTo(e.target.value)}
                        style={inputStyle}
                    />
                </label>
                {filtered && (
                    <button
                        type="button"
                        onClick={() => { setFrom(''); setTo(''); }}
                        style={{ ...inputStyle, cursor: 'pointer' }}
                    >
                        Clear dates
                    </button>
                )}
            </div>

            {loading && <p style={{ color: 'var(--hl-ink-tertiary)' }}>Loading event history...</p>}

            {!loading && error && <p style={{ color: 'var(--hl-danger)' }}>{error}</p>}

            {!loading && !error && events.length === 0 && (
                <p style={{ color: 'var(--hl-ink-tertiary)' }}>
                    {filtered
                        ? 'No events found for those dates. Try a wider range or clear the dates.'
                        : 'No events yet. Flood, lift and maintenance activity will show up here.'}
                </p>
            )}

            {!loading && events.length > 0 && (
                <div style={{ background: 'var(--hl-card-bg)', border: '1px solid var(--hl-border)', borderRadius: '14px', overflow: 'hidden' }}>
                    {events.map((item, i) => (
                        <article
                            key={item.id}
                            style={{ padding: '16px 20px', borderTop: i === 0 ? 'none' : '1px solid var(--hl-border)' }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                                <strong style={{ color: 'var(--hl-ink)', fontFamily: 'var(--font-heading)', fontWeight: 600 }}>{item.title}</strong>
                                <span
                                    title={new Date(item.createdAt).toLocaleString()}
                                    style={{ color: 'var(--hl-ink-tertiary)', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}
                                >
                                    {formatTimeAgo(item.createdAt)}
                                </span>
                            </div>
                            <p style={{ margin: '6px 0 0', color: 'var(--hl-ink-secondary)' }}>{item.description}</p>
                        </article>
                    ))}
                </div>
            )}

            {!loading && events.length > 0 && page < pageCount && (
                <button
                    type="button"
                    onClick={loadMore}
                    disabled={loadingMore}
                    style={{ ...inputStyle, cursor: loadingMore ? 'default' : 'pointer', marginTop: '14px' }}
                >
                    {loadingMore ? 'Loading...' : 'Load more'}
                </button>
            )}
        </>
    );
};

const labelStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: 'var(--hl-ink-secondary)',
    fontSize: '13px',
    fontWeight: 600,
};

const inputStyle = {
    padding: '8px 12px',
    borderRadius: '9px',
    border: '1px solid var(--hl-border)',
    background: 'var(--hl-card-bg)',
    color: 'var(--hl-ink)',
    fontSize: '13px',
    fontWeight: 600,
};

export default History;
