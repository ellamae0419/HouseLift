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
    { icon: 'text', title: 'Flood text alerts', text: 'You get a text when the platform lifts, again if the water reaches the critical level, and when it is all clear.' },
    { icon: 'chart', title: 'Live water level', text: 'See the water level and whether your unit is online, from your phone or computer.' },
    { icon: 'updown', title: 'Lift from your phone', text: 'Raise or lower the house from the dashboard when you want to, not only during a flood.' },
    { icon: 'toggle', title: 'Manual switch', text: 'A toggle switch on the unit lifts or lowers the house by hand.' },
    { icon: 'list', title: 'History and reports', text: 'Every lift is recorded with its date. Filter the history and see water level trends for 24 hours, 7 days or 30 days.' },
];

// What HydroLift does, stage by stage, with what the owner is texted at each one. This follows the
// stages in the Flood-Adaptive Pethouse design and the alerts the system sends (see docs/alerts.md).
const STAGES = [
    {
        tag: 'All the time',
        title: 'It watches the water',
        text: [
            'A water level sensor is read many times a second. It reports the water on a scale from 0 (dry) to 4 (the highest the sensor can read).',
            'A splash, a ripple or a bucket of water thrown by accident is ignored. Only water that keeps rising makes the unit act.',
        ],
        sms: 'Nothing to do. Once a day the dashboard notes that your unit is online and working.',
    },
    {
        tag: 'Stage 1 · Warning',
        title: 'The house lifts, step by step',
        text: [
            'When the water is rising, four actuators raise the platform together. It climbs in proportion to the water: the higher the water, the higher the house, with no sudden jump.',
            'From low to fully raised takes about 10 seconds. The platform is fully up when the water reaches the flood level, and it stays up until the water has clearly dropped.',
        ],
        sms: 'You get a WARNING text that the water has reached the warning level and your platform was raised automatically. It is sent once, and not again for 10 minutes.',
    },
    {
        tag: 'Stage 2 · Floating',
        title: 'If the water keeps rising',
        text: [
            'If the water rises past the flood level after the platform is fully up, the house can float on it. Your pet is protected for now, but the water is still rising and you should stay alert.',
        ],
        sms: 'You get a text that the water is still rising and the house is floating, so you can get ready.',
    },
    {
        tag: 'Stage 3 · Critical',
        title: 'The lift has no more height to give',
        text: [
            'When the water reaches the critical level, the platform has used all of its travel and the house can no longer be kept above the water by lifting alone. This is the moment to act.',
            'HydroLift cannot move your pet for you. If you can do so safely, go and get your pet out.',
        ],
        sms: 'You get a CRITICAL text straight away: get your pet to safety now. It is sent again every 5 minutes for as long as the water stays that high.',
    },
    {
        tag: 'Recovery · All clear',
        title: 'The water goes down',
        text: [
            'When the water has clearly dropped, the platform lowers by itself and the house settles back to its normal height. You do not need to be there.',
        ],
        sms: 'You get an ALL CLEAR text, so you know the flood has passed and the platform was lowered.',
    },
    {
        tag: 'If something is wrong',
        title: 'It tells you about problems',
        text: [
            'If the unit finds a problem, such as a lift that could not finish, or if its battery is running low, it reports it so you can fix it before the next flood.',
        ],
        sms: 'You get a text saying the unit reported a problem, or that the battery is low and needs charging or replacing.',
    },
    {
        tag: 'Whenever you want',
        title: 'You stay in control',
        text: [
            'On the dashboard you can watch the water level live, see whether your unit is online, and raise or lower the house from your phone or computer.',
            'On the unit itself, a toggle switch raises or lowers the house by hand. Every lift is saved with its date, and the reports show the water level over 24 hours, 7 days or 30 days.',
        ],
        sms: 'A lift or lowering that you start yourself, from the dashboard or the switch, never sends a flood text, because you already know about it.',
    },
    {
        tag: 'If the internet fails',
        title: 'It keeps lifting',
        text: [
            'Sensing and lifting run on the unit itself, so a dropped WiFi connection does not stop it from lifting the house.',
            'The dashboard, the history and the text alerts do need WiFi, so while it is down you will not see them or receive texts.',
        ],
        sms: null,
    },
];

// The same alerts as a quick table.
const ALERTS = [
    ['Flood warning', 'The platform lifts by itself because the water is rising. Sent once, then not again for 10 minutes.'],
    ['House is floating', 'The water keeps rising after the platform is fully up. At most once every 10 minutes.'],
    ['CRITICAL flood level', 'The water reaches the critical level. Sent at once, then every 5 minutes while the water stays that high.'],
    ['All clear', 'The water has gone down and the platform was lowered. At most once every 10 minutes.'],
    ['Unit fault', 'The unit reports a problem. At most once every 30 minutes.'],
    ['Battery low', 'The unit reports a low battery. At most once every 6 hours.'],
    ['Daily online check', 'Shown on the dashboard only. It is never texted.'],
];

const BUY_STEPS = [
    { title: 'Send an inquiry', text: 'Give your name and mobile number on the inquiry form. You can add the size you are thinking of and a question. You do not need an account, and nothing is paid online.' },
    { title: 'We contact you', text: 'We reply on your mobile number, answer your questions, help you choose a size and agree on a time and place to meet.' },
    { title: 'Meet, pay and get registered', text: 'You pay and pick up your HydroLift in person. We look at your valid ID with you, register you as the owner and give you your username, password and a serial code. Flood texts go to the mobile number you gave.' },
    { title: 'Log in and activate', text: 'Go to the login page, log in, and type in the serial code. This links the unit to your account and opens your dashboard.' },
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
    { q: 'Can I buy online?', a: 'No. HydroLift is sold face to face only. There is no online payment and no delivery. You pay and pick up your unit in person. The website only takes your inquiry.' },
    { q: 'How do I buy one?', a: 'Send an inquiry with your name and mobile number. We contact you, answer your questions and agree on a time and place to meet. You pay and pick up your unit in person, and we register you and give you your login and serial code.' },
    { q: 'Do I need an account to ask?', a: 'No. Anyone can send an inquiry with just a name and a mobile number. No account is made, and nothing is paid online.' },
    { q: 'How much does it cost?', a: 'The price depends on the size, and we confirm it when we contact you. You pay it in person. There is nothing to pay online.' },
    { q: 'Which size should I choose?', a: 'Choose the size where your pet can stand, turn around and lie fully stretched out. If your pet is between sizes, choose the larger one. Small suits cats, puppies and toy breeds up to 7 kg. Medium suits aspins, beagles and shih tzu up to 18 kg. Large suits Labradors, huskies and large aspins up to 40 kg. Not sure? Tell us your pet’s breed and weight in your inquiry and we will help you choose.' },
    { q: 'What do I get when I buy?', a: 'The pet house on its lifting platform, with the four actuators, the WiFi controller and the water level sensor, plus the toggle switch for lifting by hand. You also get your login to the dashboard and a serial code that links the unit to your account. The Specifications page lists everything.' },
    { q: 'When do I get my account?', a: 'When you pay and pick up your HydroLift. We check your ID and register you, then give you your username, password and serial code. You cannot log in before that.' },
    { q: 'Why do you need my ID?', a: 'So we know who owns each unit and can link it to the right account. We check your ID with you in person when you buy and keep a photo of it. Only HydroLift administrators can see it.' },
    { q: 'What is the serial code?', a: 'A code like HL-7QK2-M9XD-4PWH that we give you when you pay and pick up your unit. After you log in, you type it in once. That links the unit to your account and opens your dashboard. It works only for your account.' },
    { q: 'What does HydroLift do in a flood?', a: 'It senses the water rising and lifts your pet’s house on its own, in step with the water, so the house stays above it. It texts you as the flood grows and again when it has passed, and lowers the house when the water has gone down. The How it works page explains each stage.' },
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
                                <Link to="/inquire" className={shellStyles.btn}>Inquire now</Link>
                                <Link to="/how-it-works" className={`${shellStyles.btn} ${shellStyles.btnOutline}`}>See how it works</Link>
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

                <section className={`${styles.section} ${styles.tint}`} aria-label="Inquire">
                    <div className={styles.wrap}>
                        <div className={styles.orderBox}>
                            <div>
                                <span className={styles.eyebrow}>Inquire</span>
                                <h2>Get your HydroLift before the next flood.</h2>
                                <p>The inquiry takes a minute. HydroLift is sold face to face only, so you pay and pick up in person. Nothing is paid online, and you do not need an account to ask.</p>
                                <div className={styles.orderAction}>
                                    <Link to="/inquire" className={shellStyles.btn}>Send an inquiry</Link>
                                </div>
                            </div>
                            <ul className={styles.needs} aria-label="What you need">
                                <li><Tick fill="#7fd1cc" />Your name and mobile number</li>
                                <li><Tick fill="#7fd1cc" />The size you are thinking of (optional)</li>
                                <li><Tick fill="#7fd1cc" />A question for us (optional)</li>
                                <li><Tick fill="#7fd1cc" />A valid ID when you meet us to buy</li>
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
                                        <Link to={`/inquire?size=${size.value}`} className={shellStyles.btn}>Ask about {size.name}</Link>
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

/* ---------- How it works (and how to buy) ---------- */
export const HowItWorks = () => {
    setTitle('How HydroLift works');
    return (
        <ShopShell>
            <main>
                <section className={styles.section}>
                    <div className={styles.wrap}>
                        <PageHead eyebrow="How it works" title="From rising water to a safe pet">
                            Here is what HydroLift does, one stage at a time, and the text you get at each stage.
                        </PageHead>
                        <ol className={styles.stages}>
                            {STAGES.map((s) => (
                                <li key={s.title} className={styles.stage}>
                                    <div className={styles.stageBody}>
                                        <span className={styles.stageTag}>{s.tag}</span>
                                        <h2>{s.title}</h2>
                                        {s.text.map((t) => <p key={t}>{t}</p>)}
                                        {s.sms && <div className={styles.stageSms}><strong>What you get:</strong> {s.sms}</div>}
                                    </div>
                                </li>
                            ))}
                        </ol>

                        <h2 className={styles.subhead}>Your text alerts at a glance</h2>
                        <table className={styles.specTable}>
                            <tbody>
                                {ALERTS.map(([k, v]) => <tr key={k}><th scope="row">{k}</th><td>{v}</td></tr>)}
                            </tbody>
                        </table>
                        <p className={styles.note}>
                            <strong>Please remember.</strong> HydroLift lifts the house as high as its lift can travel. It cannot move your pet for you. When you get the CRITICAL text, act on it.
                        </p>
                    </div>
                </section>
                <section className={`${styles.section} ${styles.tint}`}>
                    <div className={styles.wrap}>
                        <div className={styles.head}>
                            <span className={styles.eyebrow}>How to buy</span>
                            <h2>From inquiry to pick-up</h2>
                            <p>HydroLift is sold face to face only. You send an inquiry, then pay and pick up your unit in person.</p>
                        </div>
                        <Steps items={BUY_STEPS} />
                        <p className={styles.note}>
                            <strong>Why we ask for an ID.</strong> It tells us who owns each unit. We check it in person when you buy, and only HydroLift administrators can see it.
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
                            Questions about HydroLift, your inquiry or your unit.
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
                            <strong>After you send an inquiry,</strong> we contact you on the mobile number you give, to answer your questions and arrange a time to meet, pay and pick up your unit.
                        </p>
                        <div className={styles.contactActions}>
                            <Link to="/inquire" className={shellStyles.btn}>Inquire now</Link>
                            {appBase && <a href={appUrl('/login?fresh=1')} className={`${shellStyles.btn} ${shellStyles.btnOutline}`}>Log in to your account</a>}
                        </div>
                    </div>
                </section>
            </main>
        </ShopShell>
    );
};

export default Landing;
