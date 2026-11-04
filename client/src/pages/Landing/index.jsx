import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import styles from './style.module.css';
import axios from '../../lib/axios';
import { setTitle } from '../../utils/generalFunctions';
import { CONTACT } from '../../config/shopContact';
import { SIZES } from '../../config/shopSizes';
import { ShopShell } from '../../components/ShopShell/index';
import shellStyles from '../../components/ShopShell/shell.module.css';
import { houseSvg, VIEW_BOX } from '../../components/ShopShell/isometric';

// The shop's pages. The menu opens one at a time: Home, About, Product,
// Specifications and FAQ each show only their own content.

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
    { icon: 'text', title: 'Flood text alerts', text: 'You get a text when the platform lifts, again if the water reaches the critical level, and when it is all clear.' },
    { icon: 'chart', title: 'Live water level', text: 'See the water level and whether your unit is online, from your phone or computer.' },
    { icon: 'updown', title: 'Lift from your phone', text: 'Raise or lower the house from the dashboard when you want to, not only during a flood.' },
    { icon: 'toggle', title: 'Manual switch', text: 'A toggle switch on the unit lifts or lowers the house by hand.' },
    { icon: 'list', title: 'History and reports', text: 'Every lift is recorded with its date. Filter the history and see water level trends for 24 hours, 7 days or 30 days.' },
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
    { q: 'Can I buy online?', a: 'No. HydroLift is sold face to face only. There is no online payment and no delivery. You pay and pick up your unit in person. The website only takes your message or meeting request.' },
    { q: 'How do I buy one?', a: 'Choose Schedule a meeting under Contact us, and give your name, email and the day you would like to meet. We confirm the day and place with you, and answer your questions. You pay and pick up your unit in person, and we register you and give you your login and serial code.' },
    { q: 'Do I need an account to ask?', a: 'No. To send us a message, only your email is needed. To schedule a meeting, we ask for your name, email and a day. No account is made, and nothing is paid online.' },
    { q: 'How much does it cost?', a: 'The price depends on the size, and we confirm it when we contact you. You pay it in person. There is nothing to pay online.' },
    { q: 'Which size should I choose?', a: 'Choose the size where your pet can stand, turn around and lie fully stretched out. If your pet is between sizes, choose the larger one. Small suits cats, puppies and toy breeds up to 7 kg. Medium suits aspins, beagles and shih tzu up to 18 kg. Large suits Labradors, huskies and large aspins up to 40 kg. Not sure? Tell us your pet’s breed and weight in your message and we will help you choose.' },
    { q: 'What do I get when I buy?', a: 'The pet house on its lifting platform, with the four actuators, the WiFi controller and the water level sensor, plus the toggle switch for lifting by hand. You also get your login to the dashboard and a serial code that links the unit to your account. The Specifications page lists everything.' },
    { q: 'When do I get my account?', a: 'When you pay and pick up your HydroLift. We check your ID and register you, then give you your username, password and serial code. You cannot log in before that.' },
    { q: 'Why do you need my ID?', a: 'So we know who owns each unit and can link it to the right account. We check your ID with you in person when you buy and keep a photo of it. Only HydroLift administrators can see it.' },
    { q: 'What is the serial code?', a: 'A code like HL-7QK2-M9XD-4PWH that we give you when you pay and pick up your unit. After you log in, you type it in once. That links the unit to your account and opens your dashboard. It works only for your account.' },
    { q: 'What does HydroLift do in a flood?', a: 'It senses the water rising and lifts your pet’s house on its own, in step with the water, so the house stays above it. It texts you as the flood grows and again when it has passed, and lowers the house when the water has gone down.' },
    { q: 'What if the flood rises higher than the lift?', a: 'The platform can only rise as far as its lift can travel. If the water goes past that, the house can no longer be kept dry by lifting. You get a CRITICAL text right away and again every 5 minutes while the water stays that high, telling you to get your pet to safety. HydroLift is a protection, not a guarantee. In a strong typhoon or a very deep flood, follow local advice and bring your pet and your family to safety.' },
    { q: 'Will it still lift if my WiFi goes down?', a: 'Yes. Sensing and lifting run on the unit itself, so a dropped connection does not stop it from lifting. While the WiFi is down you will not see the dashboard or get text alerts, because those need the internet.' },
    { q: 'What texts will I get?', a: 'A warning when the platform lifts, a CRITICAL text if the water reaches the critical level (repeated every 5 minutes while it stays that high), and an ALL CLEAR when the water has gone down. You also get a text if the unit reports a problem or its battery is low. To avoid filling your phone, the other alerts are limited to one every 10 minutes or longer. A lift or lowering you start yourself never sends a flood text.' },
    { q: 'Who receives the texts, and do they cost me anything?', a: 'The texts go only to the mobile number registered on your account, and nobody else gets them. They cost you nothing. You only need a phone that can receive ordinary text messages, with no app to install.' },
    { q: 'Can I raise or lower the house myself?', a: 'Yes. You can do it from the dashboard on your phone or computer, or with the toggle switch on the unit.' },
    { q: 'What if I forget my password?', a: 'On the login page, choose Forgot password? A code is sent to your email so you can set a new one.' },
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
                                <Link to="/schedule" className={shellStyles.btn}>Schedule a meeting</Link>
                                <Link to="/contact" className={`${shellStyles.btn} ${shellStyles.btnOutline}`}>Contact us</Link>
                            </div>
                            <ul className={styles.checks}>
                                <li><Tick />Buy in person</li>
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
                        <div className={styles.stat}><b>Face to face</b><span>no online selling</span></div>
                    </div>
                </div>

                <section className={`${styles.section} ${styles.tint}`} aria-label="Contact us">
                    <div className={styles.wrap}>
                        <div className={styles.orderBox}>
                            <div>
                                <span className={styles.eyebrow}>Meet us</span>
                                <h2>Get your HydroLift before the next flood.</h2>
                                <p>HydroLift is sold face to face only, so you pay and pick up in person. Schedule a meeting, or send us a message with just your email. Nothing is paid online, and you do not need an account.</p>
                                <div className={styles.orderAction}>
                                    <Link to="/schedule" className={shellStyles.btn}>Schedule a meeting</Link>
                                    <Link to="/contact" className={`${shellStyles.btn} ${shellStyles.btnOutline}`}>Contact us</Link>
                                </div>
                            </div>
                            <ul className={styles.needs} aria-label="What you need">
                                <li><Tick fill="#7fd1cc" />To contact us: just your email</li>
                                <li><Tick fill="#7fd1cc" />To meet: your name, email and a day</li>
                                <li><Tick fill="#7fd1cc" />The size you are thinking of (optional)</li>
                                <li><Tick fill="#7fd1cc" />A valid ID when you meet us to buy</li>
                            </ul>
                        </div>
                    </div>
                </section>

                {CONTACT.email && (
                    <section className={styles.findUs} aria-label="Find us here">
                        <div className={styles.wrap}>
                            <h2>Find us here</h2>
                            <div className={styles.findRow}>
                                <svg className={styles.findIcon} viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="m4 7 8 6 8-6" />
                                </svg>
                                <div>
                                    <span className={styles.findLabel}>Email:</span>
                                    <a className={styles.findValue} href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>
                                </div>
                            </div>
                        </div>
                    </section>
                )}
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
                                        <Link to={`/contact?size=${size.value}`} className={shellStyles.btn}>Ask about {size.name}</Link>
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
                            Cannot find your answer? Use Contact us in the menu and we will reply.
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

export default Landing;
