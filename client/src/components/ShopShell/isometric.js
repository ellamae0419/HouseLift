// Draws the HydroLift pet house as an isometric picture (SVG markup). Units are
// arbitrary; one unit is about a twentieth of the picture width at S = 20.
//   lift  how far the platform is raised on its actuators (0 to 4)
//   water water height around the house (0 to 6); it never reaches the platform
//   gauge show the 0 to 4 water level ruler and the flood line
const C = 0.866;
const NAVY = '#182d44';
const REST = 3; // platform height when fully lowered

export const VIEW_BOX = '0 0 440 390';

export const houseSvg = ({ OX = 205, OY = 236, S = 20, lift = 0, water = 0, gauge = false } = {}) => {
    const P = (x, y, z) => [OX + (x - y) * C * S, OY + (x + y) * 0.5 * S - z * S];
    const pts = (a) => a.map((p) => P(...p).map((n) => n.toFixed(1)).join(',')).join(' ');
    const poly = (a, fill, extra = '') => `<polygon points="${pts(a)}" fill="${fill}" stroke="${NAVY}" stroke-width="1.4" stroke-linejoin="round" ${extra}/>`;
    const box = (x0, x1, y0, y1, zLo, zHi, top, right, left) =>
        poly([[x0, y1, zLo], [x1, y1, zLo], [x1, y1, zHi], [x0, y1, zHi]], left) +
        poly([[x1, y0, zLo], [x1, y1, zLo], [x1, y1, zHi], [x1, y0, zHi]], right) +
        poly([[x0, y0, zHi], [x1, y0, zHi], [x1, y1, zHi], [x0, y1, zHi]], top);

    const z0 = REST + lift;
    const zf = z0 + 0.5;
    const zw = z0 + 4;
    const zr = z0 + 6.3;
    const W = '#b9733d';
    const Wl = '#d6935a';
    const Wd = '#97592b';

    let s = '';

    // ground
    s += `<polygon points="${pts([[-1.2, -1.2, 0], [7.2, -1.2, 0], [7.2, 6.2, 0], [-1.2, 6.2, 0]])}" fill="#ffffff" fill-opacity=".38" stroke="${NAVY}" stroke-opacity=".25" stroke-width="1"/>`;
    const c = P(3, 2.5, 0);
    s += `<ellipse cx="${c[0].toFixed(1)}" cy="${c[1].toFixed(1)}" rx="${S * 6.4}" ry="${S * 3.2}" fill="#17676b" opacity=".14"/>`;

    // Four actuators: a fixed steel housing with a rod that extends as the platform rises.
    // Drawn in two passes, the part under the water surface first and the part above it
    // after the water, so the water looks like it is around the legs and behind the house.
    const slice = (x0, x1, y0, y1, zLo, zHi, colors, from, to) => {
        const lo = Math.max(zLo, from);
        const hi = Math.min(zHi, to);
        return hi - lo > 0.001 ? box(x0, x1, y0, y1, lo, hi, ...colors) : '';
    };
    const legs = [[0.2, 0.2], [5.4, 0.2], [0.2, 4.4], [5.4, 4.4]].sort((a, b) => (a[0] + a[1]) - (b[0] + b[1]));
    const drawLegs = (from, to) => legs.map(([x, y]) =>
        slice(x, x + 0.45, y, y + 0.45, 0, REST, ['#c4d0d6', '#7f929c', '#9aabb4'], from, to) +
        (lift > 0.01 ? slice(x + 0.11, x + 0.34, y + 0.11, y + 0.34, REST, z0, ['#eef3f5', '#b7c5cc', '#d3dde2'], from, to) : '')
    ).join('');
    const surface = water > 0.01 ? water : 0;
    s += drawLegs(0, surface || Infinity);

    // water around the house
    if (surface) {
        const x0 = -1.2;
        const x1 = 7.2;
        const y0 = -1.2;
        const y1 = 6.2;
        s += `<polygon points="${pts([[x0, y1, 0], [x1, y1, 0], [x1, y1, surface], [x0, y1, surface]])}" fill="#17676b" fill-opacity=".3"/>`;
        s += `<polygon points="${pts([[x1, y0, 0], [x1, y1, 0], [x1, y1, surface], [x1, y0, surface]])}" fill="#17676b" fill-opacity=".42"/>`;
        s += `<polygon points="${pts([[x0, y0, surface], [x1, y0, surface], [x1, y1, surface], [x0, y1, surface]])}" fill="#7fd1cc" fill-opacity=".5" stroke="#17676b" stroke-width="1.4" stroke-linejoin="round"/>`;
        s += drawLegs(surface, Infinity);
    }

    // platform, walls, door, window
    s += box(-0.2, 6.1, -0.2, 5.1, z0, zf, Wl, Wd, W);
    s += box(0.5, 5.5, 0.5, 4.5, zf, zw, '#ffffff', '#dcecee', '#ffffff');
    const arc = [[2.1, 4.5, zf], [2.1, 4.5, zf + 1.6]];
    for (let a = 180; a >= 0; a -= 15) {
        const r = (Math.PI * a) / 180;
        arc.push([3 + 0.9 * Math.cos(r), 4.5, zf + 1.6 + 0.9 * Math.sin(r)]);
    }
    arc.push([3.9, 4.5, zf]);
    s += poly(arc, NAVY);
    s += poly([[5.5, 1.5, zf + 1.4], [5.5, 3, zf + 1.4], [5.5, 3, zf + 2.7], [5.5, 1.5, zf + 2.7]], '#bfe9ef');

    // roof
    const X0 = -0.4;
    const X1 = 6.4;
    s += poly([[X0, -0.6, zw], [X1, -0.6, zw], [X1, 2.5, zr], [X0, 2.5, zr]], '#17676b');
    s += poly([[5.5, -0.6, zw], [5.5, 5.6, zw], [5.5, 2.5, zr]], '#ffffff');
    s += poly([[X0, 2.5, zr], [X1, 2.5, zr], [X1, 5.6, zw], [X0, 5.6, zw]], '#1f8287');
    s += poly([[X0, 5.6, zw], [X1, 5.6, zw], [X1, 5.6, zw - 0.3], [X0, 5.6, zw - 0.3]], '#f2a516');

    // 0 to 4 ruler and the flood line (level 2), on the front corner
    if (gauge) {
        const base = P(7.9, 6.7, 0);
        const top = P(7.9, 6.7, 6.2);
        s += `<line x1="${base[0].toFixed(1)}" y1="${base[1].toFixed(1)}" x2="${top[0].toFixed(1)}" y2="${top[1].toFixed(1)}" stroke="${NAVY}" stroke-width="1.6"/>`;
        for (let n = 0; n <= 4; n++) {
            const g = P(7.9, 6.7, n * 1.5);
            s += `<line x1="${g[0].toFixed(1)}" y1="${g[1].toFixed(1)}" x2="${(g[0] + 7).toFixed(1)}" y2="${g[1].toFixed(1)}" stroke="${NAVY}" stroke-width="1.4"/>`;
            s += `<text x="${(g[0] + 12).toFixed(1)}" y="${(g[1] + 4).toFixed(1)}" font-family="DM Sans,sans-serif" font-size="12" font-weight="600" fill="${NAVY}">${n}</text>`;
        }
        const f0 = P(-1.2, 6.2, 3);
        const f1 = P(7.2, 6.2, 3);
        s += `<line x1="${f0[0].toFixed(1)}" y1="${f0[1].toFixed(1)}" x2="${f1[0].toFixed(1)}" y2="${f1[1].toFixed(1)}" stroke="#17676b" stroke-width="1.6" stroke-dasharray="6 5"/>`;
        s += `<text x="${(f0[0] - 8).toFixed(1)}" y="${(f0[1] + 4).toFixed(1)}" text-anchor="end" font-family="DM Sans,sans-serif" font-size="12" font-weight="600" fill="#17676b">flood level</text>`;
    }

    return s;
};
