import styles from './style.module.css';
import { setTitle } from '../../utils/generalFunctions';
import { appBase, appUrl } from '../../utils/siteLinks';
import { ShopShell } from '../../components/ShopShell/index';
import { FindUsList, hasFindUs } from '../../components/ShopShell/FindUs';
import shellStyles from '../../components/ShopShell/shell.module.css';
import { Link, useSearchParams } from 'react-router-dom';
import { SIZES, sizeByValue } from '../../config/shopSizes';

import { useRef, useState, useEffect } from 'react';
import axios from '../../lib/axios';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const fullNameRegex = /^[A-Za-zÀ-ÿ' -]{2,100}$/;

const Hint = ({ show, children }) => (show ? <span className={`${styles.hint} ${styles.hintBad}`}>{children}</span> : null);

const todayIso = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// HydroLift is sold face to face only. These forms only reach us: they make no account and take no ID.
// An admin registers the buyer, and gives them their login and serial code, once they have paid in person.
//  - "contact": a message to us. Only the email is required, so we can reply.
//  - "meeting": a request to meet. It needs a name, an email and a day.
const ContactForm = ({ mode }) => {
    const isMeeting = mode === 'meeting';
    setTitle(isMeeting ? 'Schedule a meeting' : 'Contact HydroLift');

    const [product, setProduct] = useState({ name: 'HydroLift', price: null, sizes: [] });

    // The product page's "Inquire" buttons open this form with a size already chosen.
    const [searchParams] = useSearchParams();
    const [size, setSize] = useState(() => (sizeByValue(searchParams.get('size')) ? searchParams.get('size') : ''));
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [meetingDate, setMeetingDate] = useState('');
    const [meetingTime, setMeetingTime] = useState('');
    const [message, setMessage] = useState('');
    const [website, setWebsite] = useState('');   // a hidden box real visitors never fill; bots do
    const [errMsg, setErrMsg] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [sent, setSent] = useState(false);
    const errRef = useRef();

    useEffect(() => {
        axios.get('/shop/product')
            .then((res) => setProduct((old) => ({ ...old, ...res.data })))
            .catch(() => { /* the form still works without the price */ });
    }, []);

    useEffect(() => { setErrMsg(''); }, [size, fullName, email, meetingDate, meetingTime, message]);

    const noteMax = isMeeting ? 400 : 500;
    // Both forms need an email so we can reply. A meeting also needs a name and a day.
    const validFullName = isMeeting ? fullNameRegex.test(fullName.trim()) : (!fullName.trim() || fullNameRegex.test(fullName.trim()));
    const validEmail = emailRegex.test(email.trim());
    const validDate = meetingDate >= todayIso();
    const validMessage = message.length <= noteMax;

    const chosen = sizeByValue(size);
    // A price set for this size wins, then the one price for every size, then none.
    const price = product.sizes?.find((x) => x.value === size)?.price ?? product.price;

    const canSubmit = validFullName && validEmail && validMessage && (!isMeeting || validDate) && !submitting;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!canSubmit) return;
        setSubmitting(true);
        try {
            await axios.post('/shop/inquiries', isMeeting
                ? { type: 'meeting', fullName: fullName.trim(), email: email.trim(), size, meetingDate, meetingTime, message: message.trim(), website }
                : { type: 'contact', fullName: fullName.trim(), email: email.trim(), size, message: message.trim(), website });
            setSent(true);
        } catch (err) {
            if (!err?.response) setErrMsg('No server response. Check your connection and try again.');
            else setErrMsg(err.response?.data?.message || 'We could not send your message.');
            errRef.current?.focus();
        } finally {
            setSubmitting(false);
        }
    };

    if (sent) {
        return (
            <ShopShell>
                <main className={styles.page}>
                    <div className={styles.wrap}>
                        <div className={styles.done}>
                            <div className={styles.doneMark}>
                                <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="#182d44" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
                            </div>
                            <h1>{isMeeting ? 'Meeting request sent' : 'Message sent'}</h1>
                            <p>
                                Thank you{fullName.trim() ? `, ${fullName.trim().split(' ')[0]}` : ''}.{' '}
                                {isMeeting
                                    ? `We will email ${email.trim()} to confirm the day and the place.`
                                    : `We will reply to ${email.trim()}.`}
                                {' '}You do not need an account, and there is nothing to pay online.
                            </p>
                            <ol className={styles.doneSteps}>
                                <li>{isMeeting ? 'We confirm the day and place with you.' : 'We reply and answer your questions.'}</li>
                                <li>You pay and pick up your HydroLift in person. We check your ID and register you.</li>
                                <li>We give you your username, password and serial code.</li>
                                <li>You log in and enter the serial code to link the unit to your account.</li>
                            </ol>
                            <div className={styles.doneAction}>
                                <Link to="/" className={shellStyles.btn}>Back to the shop</Link>
                            </div>
                        </div>
                    </div>
                </main>
            </ShopShell>
        );
    }

    if (!isMeeting) {
        return (
            <ShopShell>
                <main className={styles.page} id="inquiry-form">
                    <div className={`${styles.wrap} ${styles.twoCol}`}>
                        <section aria-label="Find us here">
                            <h2 className={styles.colTitle}>Find us here</h2>
                            {hasFindUs
                                ? <FindUsList />
                                : <p className={styles.intro}>Send us a message with the form and we will reply by email.</p>}
                            <p className={styles.hint} style={{ marginTop: 28 }}>HydroLift is sold face to face only. Nothing is paid online.</p>
                        </section>

                        <form className={`${styles.fields} ${styles.contactCard}`} id="inquiry" onSubmit={handleSubmit} noValidate>
                            <h1>Contact us</h1>
                            <label className={`${styles.field} ${email && !validEmail ? styles.invalid : ''}`} htmlFor="email">
                                Your Email (required)
                                <input type="email" id="email" autoComplete="email" placeholder="you@email.com"
                                    value={email} onChange={(e) => setEmail(e.target.value)} required />
                                <Hint show={email && !validEmail}>Enter a valid email address.</Hint>
                            </label>
                            <label className={`${styles.field} ${fullName && !validFullName ? styles.invalid : ''}`} htmlFor="fullName">
                                Your Name (optional)
                                <input type="text" id="fullName" autoComplete="name" placeholder="Juan Dela Cruz"
                                    value={fullName} onChange={(e) => setFullName(e.target.value)} />
                                <Hint show={fullName && !validFullName}>Use letters only, 2 to 100 characters, or leave it empty.</Hint>
                            </label>
                            <label className={`${styles.field} ${!validMessage ? styles.invalid : ''}`} htmlFor="message">
                                Your Message (optional)
                                <textarea id="message" rows={4} placeholder="e.g. What size fits my beagle?"
                                    value={message} onChange={(e) => setMessage(e.target.value)} />
                                <Hint show={!validMessage}>Keep it under {noteMax} characters.</Hint>
                            </label>
                            <fieldset className={styles.sizePills}>
                                <legend className={styles.groupTitle}>Which size? (optional)</legend>
                                {SIZES.map((x) => (
                                    <label key={x.value} htmlFor={`size-${x.value}`} className={`${styles.sizePill} ${size === x.value ? styles.sizePillOn : ''}`}>
                                        <input type="radio" id={`size-${x.value}`} name="size" value={x.value} checked={size === x.value} onChange={() => setSize(x.value)} />
                                        {x.name}
                                    </label>
                                ))}
                                {size && <button type="button" className={styles.linkBtn} onClick={() => setSize('')}>Clear</button>}
                            </fieldset>
                            <div className={styles.srOnly} aria-hidden="true">
                                <label htmlFor="website">Leave this empty
                                    <input type="text" id="website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
                                </label>
                            </div>
                            <div className={styles.sendRow}>
                                <p ref={errRef} tabIndex={-1} className={errMsg ? styles.error : ''} role="alert" hidden={!errMsg}>{errMsg}</p>
                                <button type="submit" id="sendInquiry" className={`${shellStyles.btn} ${shellStyles.btnWide}`} disabled={!canSubmit}>
                                    {submitting ? 'Sending…' : 'Send message'}
                                </button>
                                {appBase && <p className={styles.foot}>Already bought one? <a href={appUrl('/login?fresh=1')}>Log in</a></p>}
                            </div>
                        </form>
                    </div>
                </main>
            </ShopShell>
        );
    }

    return (
        <ShopShell>
            <main className={styles.page} id="inquiry-form">
                <div className={styles.wrap}>
                    <span className={styles.eyebrow}>{isMeeting ? 'Schedule a meeting' : 'Contact us'}</span>
                    <h1 className={styles.title}>{isMeeting ? 'Schedule a meeting' : 'Contact us'}</h1>
                    <p className={styles.intro}>
                        {isMeeting
                            ? 'HydroLift is sold face to face only. Tell us the day you would like to meet and your email, and we will confirm. You do not need an account, and nothing is paid online.'
                            : 'Send us a message and we will reply by email. Only your email is needed. HydroLift is sold face to face only, so nothing is paid online.'}
                    </p>

                    <div className={styles.box}>
                        <form className={styles.fields} id="inquiry" onSubmit={handleSubmit} noValidate>
                            <div className={styles.group}>
                                <h2 className={styles.groupTitle}>Which size? (optional)</h2>
                                <fieldset className={styles.sizes}>
                                    <legend className={styles.srOnly}>Size of the pet house</legend>
                                    {SIZES.map((x) => (
                                        <label key={x.value} htmlFor={`size-${x.value}`} className={`${styles.sizeCard} ${size === x.value ? styles.sizeOn : ''}`}>
                                            <input type="radio" id={`size-${x.value}`} name="size" value={x.value} checked={size === x.value} onChange={() => setSize(x.value)} />
                                            <strong>{x.name}</strong>
                                            <span>{x.fit}</span>
                                            <small>Inside {x.inside}</small>
                                            <small>{x.petWeight}</small>
                                        </label>
                                    ))}
                                </fieldset>
                                <span className={styles.hint}>
                                    Not sure yet? Leave it empty and we will help you choose.
                                    {size && <> <button type="button" className={styles.linkBtn} onClick={() => setSize('')}>Clear my choice</button></>}
                                </span>
                            </div>

                            <div className={styles.group}>
                                <h2 className={styles.groupTitle}>{isMeeting ? 'When and how to reach you' : 'Your details'}</h2>
                                {isMeeting ? (
                                    <>
                                        <label className={`${styles.field} ${fullName && !validFullName ? styles.invalid : ''}`} htmlFor="fullName">
                                            Full name
                                            <input type="text" id="fullName" autoComplete="name" placeholder="Juan Dela Cruz"
                                                value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                                            <Hint show={fullName && !validFullName}>Use letters only, 2 to 100 characters.</Hint>
                                        </label>
                                        <label className={`${styles.field} ${email && !validEmail ? styles.invalid : ''}`} htmlFor="email">
                                            Email
                                            <input type="email" id="email" autoComplete="email" placeholder="you@email.com"
                                                value={email} onChange={(e) => setEmail(e.target.value)} required />
                                            <Hint show={email && !validEmail}>Enter a valid email address.</Hint>
                                        </label>
                                        <div className={styles.row2}>
                                            <label className={`${styles.field} ${meetingDate && !validDate ? styles.invalid : ''}`} htmlFor="meetingDate">
                                                Day you would like to meet
                                                <input type="date" id="meetingDate" min={todayIso()}
                                                    value={meetingDate} onChange={(e) => setMeetingDate(e.target.value)} required />
                                                <Hint show={meetingDate && !validDate}>Choose a day that has not passed.</Hint>
                                            </label>
                                            <label className={styles.field} htmlFor="meetingTime">
                                                Time (optional)
                                                <input type="time" id="meetingTime" value={meetingTime} onChange={(e) => setMeetingTime(e.target.value)} />
                                            </label>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <label className={`${styles.field} ${email && !validEmail ? styles.invalid : ''}`} htmlFor="email">
                                            Email
                                            <input type="email" id="email" autoComplete="email" placeholder="you@email.com"
                                                value={email} onChange={(e) => setEmail(e.target.value)} required />
                                            <Hint show={email && !validEmail}>Enter a valid email address.</Hint>
                                        </label>
                                        <label className={`${styles.field} ${fullName && !validFullName ? styles.invalid : ''}`} htmlFor="fullName">
                                            Full name (optional)
                                            <input type="text" id="fullName" autoComplete="name" placeholder="Juan Dela Cruz"
                                                value={fullName} onChange={(e) => setFullName(e.target.value)} />
                                            <Hint show={fullName && !validFullName}>Use letters only, 2 to 100 characters, or leave it empty.</Hint>
                                        </label>
                                    </>
                                )}
                                <label className={`${styles.field} ${!validMessage ? styles.invalid : ''}`} htmlFor="message">
                                    {isMeeting ? 'A note for us (optional)' : 'Your message (optional)'}
                                    <textarea id="message" rows={4} placeholder={isMeeting ? 'e.g. I would like to see the Medium size.' : 'e.g. What size fits my beagle?'}
                                        value={message} onChange={(e) => setMessage(e.target.value)} />
                                    <Hint show={!validMessage}>Keep it under {noteMax} characters.</Hint>
                                </label>
                                <div className={styles.srOnly} aria-hidden="true">
                                    <label htmlFor="website">Leave this empty
                                        <input type="text" id="website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
                                    </label>
                                </div>
                            </div>
                        </form>

                        <aside className={styles.panel} aria-label="How buying works">
                            <div className={styles.panelInner}>
                                <span className={styles.eyebrow}>{isMeeting ? 'Request meeting' : 'Your message'}</span>
                                <div>
                                    <div className={styles.panelName}>{product.name}{chosen ? ` · ${chosen.name}` : ''}</div>
                                    {price
                                        ? <div className={styles.panelPrice}>₱{price.toLocaleString('en-PH')}</div>
                                        : <div className={`${styles.panelPrice} ${styles.panelPriceSmall}`}>Price confirmed when we reply</div>}
                                    <p className={styles.panelNote}>Face to face only. Nothing to pay online and no delivery.</p>
                                </div>
                                <ol className={styles.next}>
                                    <li>{isMeeting ? 'We confirm the day and place with you.' : 'We reply by email and answer your questions.'}</li>
                                    <li>You pay and pick up your unit in person.</li>
                                    <li>We register you and give you your login and serial code.</li>
                                </ol>
                                <div className={styles.panelEnd}>
                                    <p ref={errRef} tabIndex={-1} className={errMsg ? styles.error : ''} role="alert" hidden={!errMsg}>{errMsg}</p>
                                    <button type="submit" form="inquiry" id="sendInquiry" className={`${shellStyles.btn} ${shellStyles.btnWide}`} disabled={!canSubmit}>
                                        {submitting ? 'Sending…' : (isMeeting ? 'Request meeting' : 'Send message')}
                                    </button>
                                    {appBase && <p className={styles.foot}>Already bought one? <a href={appUrl('/login?fresh=1')}>Log in</a></p>}
                                </div>
                            </div>
                        </aside>
                    </div>
                </div>
            </main>
        </ShopShell>
    );
};

export const Contact = () => <ContactForm mode="contact" />;
export const Schedule = () => <ContactForm mode="meeting" />;
