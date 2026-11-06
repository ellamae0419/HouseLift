import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import './index.css';

const MAX_LEVEL = 4;           // the water sensor reads 0 to 4
const KEEP = 600;              // readings kept per house for the graph (about 20 minutes at one every 2 seconds)
const STALE_SECONDS = 15;      // an online house that has not reported for this long is called out
const GAP_MS = 15000;          // a longer silence than this breaks the line instead of drawing across it
const MAX_LINES = 8;           // the colour palette has eight validated hues

const WINDOWS = [
    { sec: 60, label: '1 min', step: 15 },
    { sec: 300, label: '5 min', step: 60 },
    { sec: 900, label: '15 min', step: 180 },
];

// the plot area inside the SVG's own coordinate space
const VBW = 760;
const VBH = 300;
const ML = 40;
const MR = 16;
const MT = 14;
const MB = 30;
const PW = VBW - ML - MR;
const PH = VBH - MT - MB;

const ago = (ms, now) => {
    if (!ms) return 'no reading yet';
    const s = Math.max(0, Math.round((now - ms) / 1000));
    if (s < 2) return 'just now';
    if (s < 60) return `${s}s ago`;
    return `${Math.floor(s / 60)} min ago`;
};

const tick = (sec) => (sec === 0 ? 'now' : sec % 60 === 0 ? `-${sec / 60}m` : `-${sec}s`);

// The live graph: water level (0 to 4) of every house against time, scrolling to the left as time passes.
const LiveChart = ({ rows, history, now }) => {
    const [windowSec, setWindowSec] = useState(300);
    const [hidden, setHidden] = useState({});
    const [hoverX, setHoverX] = useState(null);

    // Colour follows the house, not its position in the list: sorted by device id, so a house keeps its hue.
    const charted = [...rows].sort((a, b) => String(a.h.esp32_id).localeCompare(String(b.h.esp32_id))).slice(0, MAX_LINES);
    const visible = charted.filter((r) => !hidden[r.h.esp32_id]);
    const win = WINDOWS.find((w) => w.sec === windowSec) || WINDOWS[1];

    const spanMs = windowSec * 1000;
    const start = now - spanMs;
    const x = (t) => ML + ((t - start) / spanMs) * PW;
    const y = (v) => MT + PH - (Math.min(Math.max(v, 0), MAX_LEVEL) / MAX_LEVEL) * PH;

    const series = visible.map((r) => {
        const i = charted.indexOf(r);
        const pts = (history[r.h.esp32_id] || []).filter((p) => p.t >= start - GAP_MS);
        const segments = [];
        pts.forEach((p, k) => {
            if (k === 0 || p.t - pts[k - 1].t > GAP_MS) segments.push([]);
            segments[segments.length - 1].push(p);
        });
        return { r, i, pts, segments };
    });
    const anyPoints = series.some((s) => s.pts.some((p) => p.t >= start));
    const thresholds = [...new Set(visible.map((r) => r.threshold).filter((v) => v != null))];

    // what the pointer is over, snapped to the nearest reading of each house
    let hover = null;
    if (hoverX != null) {
        const t = start + ((hoverX - ML) / PW) * spanMs;
        const rowsAt = series
            .map((s) => {
                let best = null;
                s.pts.forEach((p) => { if (!best || Math.abs(p.t - t) < Math.abs(best.t - t)) best = p; });
                return best && Math.abs(best.t - t) <= 6000 ? { s, p: best } : null;
            })
            .filter(Boolean);
        hover = { t, x: hoverX, rowsAt };
    }

    const onMove = (e) => {
        const box = e.currentTarget.getBoundingClientRect();
        const vx = ((e.clientX - box.left) / box.width) * VBW;
        setHoverX(vx >= ML && vx <= ML + PW ? vx : null);
    };

    const ticks = [];
    for (let s = windowSec; s >= 0; s -= win.step) ticks.push(s);

    const nearestX = hover && hover.rowsAt.length ? x(hover.rowsAt.reduce((m, q) => (Math.abs(q.p.t - hover.t) < Math.abs(m.p.t - hover.t) ? q : m)).p.t) : null;

    return (
        <div className="lm-chart">
            <div className="lm-toolbar">
                <div className="lm-legend" role="group" aria-label="Houses on the graph">
                    {charted.map((r, i) => {
                        const off = !!hidden[r.h.esp32_id];
                        return (
                            <button
                                type="button" key={r.h.esp32_id} className={`lm-key ${off ? 'lm-key-off' : ''}`} aria-pressed={!off}
                                onClick={() => setHidden((o) => ({ ...o, [r.h.esp32_id]: !o[r.h.esp32_id] }))}
                                title={off ? 'Show on the graph' : 'Hide from the graph'}
                            >
                                <span className="lm-swatch" style={{ background: `var(--lm-s${i + 1})` }} aria-hidden="true" />
                                <span className="lm-key-name">{r.h.username}</span>
                                <span className="lm-key-val">{r.hasReading ? r.level.toFixed(1) : '—'}</span>
                            </button>
                        );
                    })}
                </div>
                <div className="lm-range" role="group" aria-label="Time shown">
                    {WINDOWS.map((w) => (
                        <button type="button" key={w.sec} className={windowSec === w.sec ? 'lm-range-on' : ''} aria-pressed={windowSec === w.sec} onClick={() => setWindowSec(w.sec)}>{w.label}</button>
                    ))}
                </div>
            </div>

            <div className="lm-plot">
                <svg
                    viewBox={`0 0 ${VBW} ${VBH}`} className="lm-svg" role="img"
                    aria-label={`Live water level graph for the last ${win.label}. Current levels are listed on the house cards below.`}
                    onPointerMove={onMove} onPointerLeave={() => setHoverX(null)}
                >
                    <defs>
                        <clipPath id="lm-clip"><rect x={ML} y={MT - 4} width={PW} height={PH + 8} /></clipPath>
                    </defs>

                    {[0, 1, 2, 3, 4].map((v) => (
                        <g key={v}>
                            <line x1={ML} x2={ML + PW} y1={y(v)} y2={y(v)} className="lm-grid" />
                            <text x={ML - 8} y={y(v) + 4} textAnchor="end" className="lm-axis">{v}</text>
                        </g>
                    ))}
                    {ticks.map((s) => (
                        <text key={s} x={x(now - s * 1000)} y={VBH - 8} textAnchor={s === 0 ? 'end' : s === windowSec ? 'start' : 'middle'} className="lm-axis">{tick(s)}</text>
                    ))}

                    {thresholds.map((v) => (
                        <g key={v}>
                            <line x1={ML} x2={ML + PW} y1={y(v)} y2={y(v)} className="lm-limit" />
                            <text x={ML + PW - 4} y={y(v) - 5} textAnchor="end" className="lm-limit-label">Lifts at {v}</text>
                        </g>
                    ))}

                    <g clipPath="url(#lm-clip)">
                        {series.map(({ i, segments }) => segments.map((seg, k) => (
                            seg.length > 1 && (
                                <polyline key={`${i}-${k}`} className="lm-line" style={{ stroke: `var(--lm-s${i + 1})` }}
                                    points={seg.map((p) => `${x(p.t).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ')} />
                            )
                        )))}
                    </g>

                    {series.map(({ i, pts }) => {
                        const last = pts[pts.length - 1];
                        if (!last || last.t < start) return null;
                        return <circle key={`dot-${i}`} cx={x(last.t)} cy={y(last.v)} r="4" className="lm-end" style={{ fill: `var(--lm-s${i + 1})` }} />;
                    })}

                    {hover && nearestX != null && <line x1={nearestX} x2={nearestX} y1={MT} y2={MT + PH} className="lm-cross" />}
                    {hover && hover.rowsAt.map(({ s, p }) => (
                        <circle key={`h-${s.i}`} cx={x(p.t)} cy={y(p.v)} r="4" className="lm-end" style={{ fill: `var(--lm-s${s.i + 1})` }} />
                    ))}
                </svg>

                {charted.length === 0 && <div className="lm-empty">Waiting for a house to connect.</div>}
                {charted.length > 0 && visible.length === 0 && <div className="lm-empty">Every house is hidden. Click a name above to show it.</div>}
                {visible.length > 0 && !anyPoints && <div className="lm-empty">Waiting for readings. The line starts when a house sends its first reading.</div>}

                {hover && hover.rowsAt.length > 0 && (
                    <div className={`lm-tip ${hover.x > ML + PW * 0.6 ? 'lm-tip-left' : ''}`} style={{ left: `${((nearestX ?? hover.x) / VBW) * 100}%` }} role="status">
                        <div className="lm-tip-time">{new Date(hover.t).toLocaleTimeString()}</div>
                        {hover.rowsAt.map(({ s, p }) => (
                            <div className="lm-tip-row" key={s.i}>
                                <span className="lm-tip-key" style={{ background: `var(--lm-s${s.i + 1})` }} aria-hidden="true" />
                                <b>{p.v.toFixed(1)}</b>
                                <span>{s.r.h.username}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            {rows.length > MAX_LINES && <div className="lm-note">The graph shows the first {MAX_LINES} houses. Every house is on the cards below.</div>}
        </div>
    );
};

// Live monitoring for the admin overview: every connected house, updating as readings arrive.
// Reads come from the socket the page already has open; nothing here asks the server again.
export const LiveMonitor = ({ houses, readingsById, readingAtById, liftById, isOnline, connected }) => {
    const [history, setHistory] = useState({});
    const lastAt = useRef({});
    const [now, setNow] = useState(() => Date.now());

    // The graph scrolls and "3s ago" keeps counting even when no reading arrives.
    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Remember the last readings of each house for the graph.
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

            <LiveChart rows={rows} history={history} now={now} />

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
