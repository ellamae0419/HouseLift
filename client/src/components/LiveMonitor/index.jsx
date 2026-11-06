import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import './index.css';

const MAX_LEVEL = 4;           // the water sensor reads 0 to 4
const KEEP = 90;               // readings kept for the trend line (about 3 minutes at one every 2 seconds)
const STALE_SECONDS = 15;      // an online house that has not reported for this long is called out

const ago = (ms, now) => {
    if (!ms) return 'no reading yet';
    const s = Math.max(0, Math.round((now - ms) / 1000));
    if (s < 2) return 'just now';
    if (s < 60) return `${s}s ago`;
    return `${Math.floor(s / 60)} min ago`;
};

// A small line of the last readings, with the lift level drawn as a dashed line.
const Trend = ({ points, threshold, name }) => {
    const W = 220;
    const H = 44;
    const x = (i) => (points.length < 2 ? W : (i / (points.length - 1)) * W);
    const y = (v) => H - 3 - (Math.min(Math.max(v, 0), MAX_LEVEL) / MAX_LEVEL) * (H - 6);
    return (
        <svg className="lm-trend" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label={`Recent water level for ${name}`}>
            {threshold != null && <line x1="0" x2={W} y1={y(threshold)} y2={y(threshold)} className="lm-trend-limit" />}
            {points.length >= 2 && <polyline points={points.map((p, i) => `${x(i).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ')} className="lm-trend-line" />}
            {points.length === 1 && <circle cx={W - 2} cy={y(points[0].v)} r="2.5" className="lm-trend-dot" />}
        </svg>
    );
};

// Live monitoring for the admin overview: every connected house, updating as readings arrive.
// Reads come from the socket the page already has open; nothing here asks the server again.
export const LiveMonitor = ({ houses, readingsById, readingAtById, liftById, isOnline, connected }) => {
    const [history, setHistory] = useState({});
    const lastAt = useRef({});
    const [now, setNow] = useState(() => Date.now());

    // "3s ago" has to keep counting even when no reading arrives.
    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Remember the last readings of each house for its trend line.
    useEffect(() => {
        const fresh = Object.keys(readingAtById).filter((id) => readingAtById[id] !== lastAt.current[id]);
        if (!fresh.length) return;
        setHistory((old) => {
            const next = { ...old };
            fresh.forEach((id) => {
                lastAt.current[id] = readingAtById[id];
                next[id] = [...(old[id] || []), { t: readingAtById[id], v: readingsById[id] }].slice(-KEEP);
            });
            return next;
        });
    }, [readingAtById, readingsById]);

    const rows = houses.map((h) => {
        const level = readingsById[h.esp32_id];
        const hasReading = level != null;
        const threshold = h.threshold != null ? Number(h.threshold) : null;
        const online = isOnline(h);
        const lifted = hasReading && threshold != null && level >= threshold;
        const seenAt = readingAtById[h.esp32_id];
        const stale = online && hasReading && now - seenAt > STALE_SECONDS * 1000;
        return { h, level, hasReading, threshold, online, lifted, seenAt, stale, lift: liftById[h.esp32_id] };
    });

    const onlineCount = rows.filter((r) => r.online).length;
    const liftedCount = rows.filter((r) => r.online && r.lifted).length;
    const highest = rows.reduce((m, r) => (r.online && r.hasReading && r.level > m ? r.level : m), 0);

    return (
        <section className="hl-card-shell hl-glance-card lm" aria-label="Live monitoring">
            <div className="lm-head">
                <div>
                    <div className="hl-glance-title lm-title">Live monitoring</div>
                    <div className="lm-sub">
                        {rows.length === 0
                            ? 'Waiting for a house to connect.'
                            : `${onlineCount} of ${rows.length} online · ${liftedCount} lifted · highest water ${highest.toFixed(1)} of ${MAX_LEVEL}`}
                    </div>
                </div>
                <div className="lm-head-right">
                    <span className={`lm-live ${connected ? 'lm-live-on' : ''}`} role="status">
                        <span className="lm-dot" aria-hidden="true" />{connected ? 'Live' : 'Reconnecting…'}
                    </span>
                    <Link to="/admin/house-monitoring" className="lm-link">Open flood monitoring</Link>
                </div>
            </div>

            {rows.length > 0 && (
                <div className="lm-grid">
                    {rows.map(({ h, level, hasReading, threshold, online, lifted, seenAt, stale, lift }) => {
                        const pct = hasReading ? Math.min(100, Math.round((level / MAX_LEVEL) * 100)) : 0;
                        const tone = !online ? 'off' : !hasReading ? 'off' : lifted ? 'warn' : 'ok';
                        return (
                            <article className={`lm-card lm-${tone}`} key={h.userId}>
                                <div className="lm-card-top">
                                    <span className="lm-name">{h.username}</span>
                                    <span className={`lm-pill ${online ? 'lm-pill-ok' : 'lm-pill-off'}`}>{online ? 'online' : 'offline'}</span>
                                </div>

                                <div className="lm-level">
                                    <span className="lm-value">{hasReading ? level.toFixed(1) : '—'}</span>
                                    <span className="lm-of">of {MAX_LEVEL}</span>
                                    <span className={`lm-state lm-state-${tone}`}>
                                        {!hasReading ? 'No data' : !online ? 'Last known' : lifted ? 'Lifted' : 'Normal'}
                                    </span>
                                </div>

                                <div className="lm-bar" role="img" aria-label={`Water level ${hasReading ? level.toFixed(1) : 'unknown'} of ${MAX_LEVEL}`}>
                                    <div className="lm-bar-fill" style={{ width: `${pct}%` }} />
                                    {threshold != null && <div className="lm-bar-mark" style={{ left: `${Math.min(100, (threshold / MAX_LEVEL) * 100)}%` }} title={`Lifts at ${threshold}`} />}
                                </div>

                                <Trend points={history[h.esp32_id] || []} threshold={threshold} name={h.username} />

                                <div className="lm-foot">
                                    <span className={stale ? 'lm-stale' : ''}>
                                        {stale ? `No reading for ${Math.round((now - seenAt) / 1000)}s` : `Reading ${ago(seenAt, now)}`}
                                    </span>
                                    <span>
                                        {lift
                                            ? `${lift.isLifted ? 'Raised' : 'Lowered'} ${ago(lift.at, now)}${lift.trigger ? ` (${lift.trigger})` : ''}`
                                            : threshold != null ? `Lifts at ${threshold}` : 'Lift level not set'}
                                    </span>
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}
        </section>
    );
};

export default LiveMonitor;
