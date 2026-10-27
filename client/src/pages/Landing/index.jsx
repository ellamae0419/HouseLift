import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import styles from './style.module.css';
import axios from '../../lib/axios';
import { setTitle } from '../../utils/generalFunctions';
import { appBase, appUrl } from '../../utils/siteLinks';
import { CONTACT } from '../../config/shopContact';
import { SIZES } from '../../config/shopSizes';
import { ShopShell } from '../../components/ShopShell/index';
import shellStyles from '../../components/ShopShell/shell.module.css';
import { houseSvg, VIEW_BOX } from '../../components/ShopShell/isometric';

// The shop's pages. The menu opens one at a time: Home, About, Product, How it works,
// Specifications, FAQ and Contact each show only their own content.

const FLOOD = 2;      // the flood level on the 0 to 4 sensor scale
const TRAVEL = 4;     // how far the platform rises in the picture
const WATER_PER_LEVEL = 1.5;

const Tick = ({ fill = '#182d44' }) => (
    <svg viewBox="0 0 18 18" aria-hidden="true">
        <circle cx="9" cy="9" r="9" fill={fill} />
        <path d="m5 9.2 2.6 2.5L13 6.4" stroke={fill === '#182d44' ? '#fff' : '#182d44'} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const ICONS = {
    steps: <path d="M3 18h5v-5h5V8h5V4" />,
    text: <path d="M4 5h16v11H10l-5 4v-4H4z" />,
    chart: <path d="M4 19V5M4 19h16M8 15l3-4 3 2 4-6" />,
    updown: <path d="M12 4v16M8 8l4-4 4 4M8 16l4 4 4-4" />,
    toggle: <><rect x="3" y="8" width="18" height="8" rx="4" /><circle cx="16" cy="12" r="2.2" /></>,
    list: <path d="M5 6h14M5 12h14M5 18h9" />,
};

const Icon = ({ name }) => (
    <div className={styles.icon}>
        <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="#17676b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{ICONS[name]}</svg>
    </div>
);

const FEATURES = [
    { icon: 'steps', title: 'Lifts in proportion', text: 'The house rises as the water rises, so there is no sudden jump at the flood line.' },
    { icon: 'text', title: 'Flood text alerts', text: 'A text goes to your mobile number when the platform lifts on its own, at most once every ten minutes.' },
    { icon: 'chart', title: 'Live water level', text: 'See the water level and whether your unit is online, from your phone or computer.' },
    { icon: 'updown', title: 'Lift from your phone', text: 'Raise or lower the house from the dashboard when you want to, not only during a flood.' },
    { icon: 'toggle', title: 'Manual switch', text: 'A toggle switch on the unit lifts or lowers the house by hand.' },
    { icon: 'list', title: 'History and reports', text: 'Every lift is recorded with its date. Filter the history and see water level trends for 24 hours, 7 days or 30 days.' },
];

const HOW = [
    { title: 'It senses the water', text: 'A water level sensor is checked many times a second. A splash is ignored. Rising water is not.' },
    { title: 'It lifts the house', text: 'The platform climbs in step with the water and is fully up when the water reaches the flood level. It stays up until the water has clearly dropped.' },
    { title: 'It texts you', text: 'When an automatic lift happens you get a text on your mobile number, so you know even when you are away.' },
    { title: 'You can check in', text: 'The dashboard shows the water level, whether the unit is online and every lift.' },
];

const BUY_STEPS = [
    { title: 'Order online', text: 'Fill in the order form and upload a photo of a valid ID.' },
    { title: 'We check your ID', text: 'We approve your order, and you can log in to your account.' },
    { title: 'Pay in person', text: 'You pay when you receive your HydroLift. We give you a serial code with it.' },
    { title: 'Activate it', text: 'Log in and enter the serial code. This links the unit to your account.' },
];

const SPECS = [
    ['Lifting', '4 linear actuators, 12 V'],
    ['Full travel', 'About 10 seconds, low to fully raised'],
    ['Sensing', 'Water level sensor, 0 to 4 scale'],
    ['Controller', 'ESP32 with WiFi'],
    ['Power', '12 V battery with a 5 V supply'],
    ['By hand', 'Toggle switch on the unit'],
];

// The house itself, as described on the product page.
const HOUSE = [
    ['Frame', 'Treated wood, sanded and sealed'],
    ['Roof', 'Waterproofed panel with a slanted gable'],
    ['Floor', 'Removable panel for washing'],
    ['Ventilation', 'Side window plus open airflow under the floor'],
    ['Made in', 'Antipolo, Rizal'],
];

const FAQS = [
    { q: 'Which size should I choose?', a: 'Your pet should be able to stand, turn around and lie fully stretched out inside. If your pet is between sizes, choose the larger one. Small suits pets up to 7 kg, Medium up to 18 kg and Large up to 40 kg.' },
    { q: 'What if the flood rises higher than the lift?', a: 'HydroLift raises the house as far as its lift can go. If the water rises past that, it can no longer keep the house dry, so please move your pet to a safe place when you get the flood text. In a strong typhoon, follow local advice and bring your pet to safety.' },
    { q: 'Do I pay online?', a: 'No. You pay in person when you receive your HydroLift. The website only takes your order and your ID.' },
    { q: 'Why do you need my ID?', a: 'So we know who owns each unit and can link it to the right account. Only HydroLift administrators can see your ID, and you agree to this when you order.' },
    { q: 'What is the serial code?', a: 'A code like HL-7QK2-M9XD-4PWH that we give you when you pay and receive your unit. Entering it after you log in proves you own the unit. It works only for your account.' },
    { q: 'Will it still lift if my WiFi goes down?', a: 'Sensing and lifting run on the unit itself, so a dropped connection does not stop it from lifting. The dashboard, history and text alerts need WiFi.' },
    { q: 'How many texts will I get?', a: 'One when an automatic lift happens, and then no more than one every ten minutes. They go to the mobile number you give when you order.' },
    { q: 'What if my order is not approved?', a: 'When you try to log in you will see the reason, for example that the ID photo was not clear. Contact us and we will sort it out.' },
];

const Price = ({ price }) => (
    price
        ? <span className={styles.price}>₱{price.toLocaleString('en-PH')}<small>one-time price, paid in person</small></span>
        : <span className={`${styles.price} ${styles.priceSmall}`}>Price confirmed when we contact you<small>paid in person</small></span>
);

const useProduct = () => {
    const [product, setProduct] = useState({ price: null });
    useEffect(() => {
        let mounted = true;
        axios.get('/shop/product')
            .then((res) => { if (mounted) setProduct(res.data); })
            .catch(() => { /* the page reads fine without a price */ });
        return () => { mounted = false; };
    }, []);
    return product;
};

const PageHead = ({ eyebrow, title, children }) => (
    <div className={styles.head}>
        <span className={styles.eyebrow}>{eyebrow}</span>
        <h1>{title}</h1>
        {children && <p>{children}</p>}
    </div>
);

const Steps = ({ items }) => (
    <ol className={styles.stepGrid}>
        {items.map((s) => (
            <li key={s.title} className={styles.step}>
                <h2>{s.title}</h2>
                <p>{s.text}</p>
            </li>
        ))}
    </ol>
);

/* ---------- Home ---------- */
export const Landing = () => {
    setTitle('A pet house that lifts above the flood');
    const [level, setLevel] = useState(1.5);

    // Same rule as the device: the platform climbs in proportion to the water and is
    // fully raised when the water reaches the flood level.
    const fraction = Math.min(level / FLOOD, 1);
    const percent = Math.round(fraction * 100);
    const heroArt = useMemo(
        () => houseSvg({ lift: fraction * TRAVEL, water: level * WATER_PER_LEVEL, gauge: true }),
        [fraction, level]
    );

    const state = level === 0
        ? 'Dry. The house rests low on its platform.'
        : level < FLOOD
            ? 'Water is rising. The platform climbs with it.'
            : 'Flood level reached. The platform is fully raised and stays up until the water drops.';

    return (
        <ShopShell>
            <main>
                <section className={styles.hero} aria-label="HydroLift">
                    <svg className={styles.wave} viewBox="0 0 1000 600" preserveAspectRatio="none" aria-hidden="true">
                        <path d="M1000 0 V600 H560 C610 520 580 440 650 390 C740 330 700 210 800 150 C880 100 940 50 1000 0 Z" fill="#ffffff" opacity=".92" />
                    </svg>
                    <div className={`${styles.wrap} ${styles.heroGrid}`}>
                        <div>
                            <span className={styles.eyebrow}>Flood-ready pet house</span>
                            <h1 className={styles.heroTitle}>A pet house that <span>rises with the flood.</span></h1>
                            <p className={styles.lead}>
                                HydroLift senses rising water and lifts your pet&apos;s house on its own. You get a text when it lifts, and you can watch the water level from your phone.
                            </p>
                            <div className={styles.ctas}>
                                <Link to="/buy" className={shellStyles.btn}>Order now</Link>
                                <Link to="/how-it-works" className={`${shellStyles.btn} ${shellStyles.btnOutline}`}>See how it works</Link>
                            </div>
                            <ul className={styles.checks}>
                                <li><Tick />Pay in person</li>
                                <li><Tick />Lifts on its own</li>
                                <li><Tick />Text alerts</li>
                            </ul>
                        </div>
                        <div className={styles.art}>
                            <svg viewBox={VIEW_BOX} role="img" aria-label="A HydroLift pet house on four actuators. The platform rises as the water around it rises." dangerouslySetInnerHTML={{ __html: heroArt }} />
                            <div className={styles.control}>
                                <div className={styles.controlHead}>
                                    <label htmlFor="demo-level">Try it: drag to raise the water</label>
                                    <output className={styles.readout} htmlFor="demo-level">Water {level.toFixed(1)} · Platform {percent}%</output>
                                </div>
                                <input
                                    id="demo-level" className={styles.range} type="range" min="0" max="4" step="0.1"
                                    value={level} onChange={(e) => setLevel(parseFloat(e.target.value))}
                                />
                                <p className={styles.state} aria-live="polite">{state}</p>
                                <p className={styles.stateNote}>This follows the real device. You get a text when an automatic lift happens.</p>
                            </div>
                        </div>
                    </div>
                </section>

                <div className={styles.stats}>
                    <div className={`${styles.wrap} ${styles.statsGrid}`}>
                        <div className={styles.stat}><b>4 actuators</b><span>lift the platform</span></div>
                        <div className={styles.stat}><b>About 10 seconds</b><span>from low to fully raised</span></div>
                        <div className={styles.stat}><b>Text alert</b><span>when it lifts</span></div>
                        <div className={styles.stat}><b>Pay on receipt</b><span>no online payment</span></div>
                    </div>
                </div>

                <section className={`${styles.section} ${styles.tint}`} aria-label="Order">
                    <div className={styles.wrap}>
                        <div className={styles.orderBox}>
                            <div>
                                <span className={styles.eyebrow}>Order</span>
                                <h2>Get your HydroLift before the next flood.</h2>
                                <p>The order form takes a few minutes. You pay nothing online.</p>
                                <div className={styles.orderAction}>
                                    <Link to="/buy" className={shellStyles.btn}>Open the order form</Link>
                                </div>
                            </div>
                            <ul className={styles.needs} aria-label="What you need">
                                <li><Tick fill="#7fd1cc" />A valid ID to photograph</li>
                                <li><Tick fill="#7fd1cc" />Your mobile number for flood texts</li>
                                <li><Tick fill="#7fd1cc" />Your delivery address</li>
                                <li><Tick fill="#7fd1cc" />A username and password</li>
                            </ul>
                        </div>
                    </div>
                </section>
            </main>
        </ShopShell>
    );
};

/* ---------- About ---------- */
export const About = () => {
    setTitle('About HydroLift');
    return (
        <ShopShell>
            <main>
                <section className={styles.section}>
                    <div className={styles.wrap}>
                        <PageHead eyebrow="About HydroLift" title="Built for homes that flood">
                            Floods can rise while you are at work or asleep. HydroLift acts without waiting for you.
                        </PageHead>
                        <div className={styles.featureGrid}>
                            {FEATURES.map((f) => (
                                <div key={f.title} className={styles.feat}>
                                    <Icon name={f.icon} />
                                    <h2>{f.title}</h2>
                                    <p>{f.text}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            </main>
        </ShopShell>
    );
};

/* ---------- Product ---------- */
export const Product = () => {
    setTitle('The HydroLift product');
    const product = useProduct();
    const cardArt = useMemo(() => houseSvg({ lift: 1.6 }), []);
    // A price set for one size wins, then the one price for every size, then none.
    const priceFor = (value) => product.sizes?.find((x) => x.value === value)?.price ?? product.price;
    return (
        <ShopShell>
            <main>
                <section className={styles.section}>
                    <div className={styles.wrap}>
                        <PageHead eyebrow="Product" title="Choose the right size">
                            Your pet should be able to stand, turn around and lie fully stretched out inside. If your pet is between sizes, choose the larger one.
                        </PageHead>
                        <div className={styles.sizeGrid}>
                            {SIZES.map((size) => (
                                <article key={size.value} className={styles.sizeCard}>
                                    <div className={styles.pic}><svg viewBox={VIEW_BOX} role="img" aria-label={`A ${size.name} HydroLift pet house raised on its actuators`} dangerouslySetInnerHTML={{ __html: cardArt }} /></div>
                                    <div>
                                        <h2>{size.name}</h2>
                                        <p className={styles.fit}>{size.fit}</p>
                                    </div>
                                    <dl>
                                        <dt>Inside size</dt><dd>{size.inside}</dd>
                                        <dt>Pet weight</dt><dd>{size.petWeight}</dd>
                                        <dt>Lifting</dt><dd>4 actuators, automatic</dd>
                                    </dl>
                                    <div className={styles.bottom}>
                                        <Price price={priceFor(size.value)} />
                                        <Link to={`/buy?size=${size.value}`} className={shellStyles.btn}>Order {size.name}</Link>
                                    </div>
                                </article>
                            ))}
                        </div>
                        <p className={styles.note}>
                            <strong>Every HydroLift comes with its sensor, controller, battery and your own dashboard.</strong> Full travel is about 10 seconds, and you get a text when it lifts on its own.
                        </p>
                    </div>
                </section>
            </main>
        </ShopShell>
    );
};

/* ---------- How it works (and how to order) ---------- */
export const HowItWorks = () => {
    setTitle('How HydroLift works');
    return (
        <ShopShell>
            <main>
                <section className={styles.section}>
                    <div className={styles.wrap}>
                        <PageHead eyebrow="How it works" title="From rising water to a safe pet" />
                        <Steps items={HOW} />
                        <p className={styles.note}>
                            <strong>Lifting does not depend on the internet.</strong> Sensing and lifting run on the unit itself. WiFi adds the dashboard, history and text alerts.
                        </p>
                    </div>
                </section>
                <section className={`${styles.section} ${styles.tint}`}>
                    <div className={styles.wrap}>
                        <div className={styles.head}>
                            <span className={styles.eyebrow}>How to order</span>
                            <h2>From order form to doorstep</h2>
                            <p>You order online, then pay in person when you receive your unit.</p>
                        </div>
                        <Steps items={BUY_STEPS} />
                        <p className={styles.note}>
                            <strong>Why we ask for an ID.</strong> It tells us who owns each unit. Only HydroLift administrators can see it, and you agree to this when you order.
                        </p>
                    </div>
                </section>
            </main>
        </ShopShell>
    );
};

/* ---------- Specifications ---------- */
export const Specifications = () => {
    setTitle('HydroLift specifications');
    const specArt = useMemo(() => houseSvg({ lift: 3 }), []);
    return (
        <ShopShell>
            <main>
                <section className={styles.section}>
                    <div className={`${styles.wrap} ${styles.specsGrid}`}>
                        <div className={styles.specArt}><svg viewBox={VIEW_BOX} role="img" aria-label="The HydroLift pet house raised on its four actuators" dangerouslySetInnerHTML={{ __html: specArt }} /></div>
                        <div>
                            <PageHead eyebrow="Specifications" title="What is in the box" />
                            <table className={styles.specTable}>
                                <tbody>
                                    {SPECS.map(([k, v]) => <tr key={k}><th scope="row">{k}</th><td>{v}</td></tr>)}
                                </tbody>
                            </table>
                            <h2 className={styles.subhead}>The house</h2>
                            <table className={styles.specTable}>
                                <tbody>
                                    {HOUSE.map(([k, v]) => <tr key={k}><th scope="row">{k}</th><td>{v}</td></tr>)}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </section>
            </main>
        </ShopShell>
    );
};

/* ---------- FAQ ---------- */
export const Faq = () => {
    setTitle('HydroLift questions');
    return (
        <ShopShell>
            <main>
                <section className={styles.section}>
                    <div className={`${styles.wrap} ${styles.faqGrid}`}>
                        <PageHead eyebrow="FAQ" title="Common questions">
                            Cannot find your answer? Open the Contact page.
                        </PageHead>
                        <div className={styles.faqList}>
                            {FAQS.map((f) => (
                                <details key={f.q}>
                                    <summary>{f.q}</summary>
                                    <p>{f.a}</p>
                                </details>
                            ))}
                        </div>
                    </div>
                </section>
            </main>
        </ShopShell>
    );
};

/* ---------- Contact ---------- */
export const Contact = () => {
    setTitle('Contact HydroLift');
    // Only what is filled in on config/shopContact.js is shown.
    const items = [
        ['Viber / mobile', CONTACT.phone],
        ['Facebook', CONTACT.facebook],
        ['Email', CONTACT.email],
        ['Showroom', CONTACT.location],
        ['Opening hours', CONTACT.hours],
    ].filter(([, value]) => value);

    return (
        <ShopShell>
            <main>
                <section className={styles.section}>
                    <div className={styles.wrap}>
                        <PageHead eyebrow="Contact" title="Get in touch">
                            Questions about HydroLift, your order or your unit.
                        </PageHead>
                        {items.length > 0 && (
                            <div className={styles.contactGrid}>
                                {items.map(([label, value]) => (
                                    <div key={label} className={styles.contactCard}>
                                        <span>{label}</span>
                                        <b>{value}</b>
                                    </div>
                                ))}
                            </div>
                        )}
                        <p className={styles.note}>
                            <strong>After you order,</strong> we contact you on the mobile number and email you give on the order form, to confirm your order and arrange payment in person.
                        </p>
                        <div className={styles.contactActions}>
                            <Link to="/buy" className={shellStyles.btn}>Order now</Link>
                            {appBase && <a href={appUrl('/login')} className={`${shellStyles.btn} ${shellStyles.btnOutline}`}>Log in to your account</a>}
                        </div>
                    </div>
                </section>
            </main>
        </ShopShell>
    );
};

export default Landing;
