import styles from './style.module.css';
import { setTitle } from '../../utils/generalFunctions';
import { appBase, appUrl } from '../../utils/siteLinks';
import { ShopShell } from '../../components/ShopShell/index';
import shellStyles from '../../components/ShopShell/shell.module.css';
import { Link, useSearchParams } from 'react-router-dom';
import { SIZES, sizeByValue } from '../../config/shopSizes';

import { useRef, useState, useEffect } from 'react';
import axios from '../../lib/axios';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const fullNameRegex = /^[A-Za-zÀ-ÿ' -]{2,100}$/;
const mobileRegex = /^09\d{9}$/;

const Hint = ({ show, children }) => (show ? <span className={`${styles.hint} ${styles.hintBad}`}>{children}</span> : null);

// HydroLift is sold face to face only. This form is just a question to us: it makes no account and
// takes no ID. An admin registers the buyer, and gives them their login and serial code, once they
// have paid in person.
export const Inquire = () => {
    setTitle('Ask about HydroLift');

    const [product, setProduct] = useState({ name: 'HydroLift', price: null, sizes: [] });

    // The product page's "Inquire" buttons open this form with a size already chosen.
    const [searchParams] = useSearchParams();
    const [size, setSize] = useState(() => (sizeByValue(searchParams.get('size')) ? searchParams.get('size') : ''));
    const [fullName, setFullName] = useState('');
    const [mobileNumber, setMobileNumber] = useState('');
    const [email, setEmail] = useState('');
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

    useEffect(() => { setErrMsg(''); }, [size, fullName, mobileNumber, email, message]);

    const validFullName = fullNameRegex.test(fullName.trim());
    const validMobile = mobileRegex.test(mobileNumber);
    const validEmail = !email || emailRegex.test(email);
    const validMessage = message.length <= 500;

    const chosen = sizeByValue(size);
    // A price set for this size wins, then the one price for every size, then none.
    const price = product.sizes?.find((x) => x.value === size)?.price ?? product.price;

    const canSubmit = validFullName && validMobile && validEmail && validMessage && !submitting;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!canSubmit) return;
        setSubmitting(true);
        try {
            await axios.post('/shop/inquiries', { fullName: fullName.trim(), mobileNumber, email: email.trim(), size, message: message.trim(), website });
            setSent(true);
        } catch (err) {
            if (!err?.response) setErrMsg('No server response. Check your connection and try again.');
            else setErrMsg(err.response?.data?.message || 'We could not send your inquiry.');
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
                            <h1>Inquiry sent</h1>
                            <p>Thank you{fullName.trim() ? `, ${fullName.trim().split(' ')[0]}` : ''}. We will contact you on {mobileNumber}. You do not need an account to ask, and there is nothing to pay online.</p>
                            <ol className={styles.doneSteps}>
                                <li>We contact you and arrange a time to meet.</li>
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

    return (
        <ShopShell>
            <main className={styles.page} id="inquiry-form">
                <div className={styles.wrap}>
                    <span className={styles.eyebrow}>Inquiry</span>
                    <h1 className={styles.title}>Ask about HydroLift</h1>
                    <p className={styles.intro}>HydroLift is sold face to face only. Send us your name and number and we will contact you to arrange a time to meet. You do not need an account to ask, and nothing is paid online.</p>

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
                                <h2 className={styles.groupTitle}>Your details</h2>
                                <label className={`${styles.field} ${fullName && !validFullName ? styles.invalid : ''}`} htmlFor="fullName">
                                    Full name
                                    <input type="text" id="fullName" autoComplete="name" placeholder="Juan Dela Cruz"
                                        value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                                    <Hint show={fullName && !validFullName}>Use letters only, 2 to 100 characters.</Hint>
                                </label>
                                <div className={styles.row2}>
                                    <label className={`${styles.field} ${mobileNumber && !validMobile ? styles.invalid : ''}`} htmlFor="mobileNumber">
                                        Mobile number
                                        <input type="tel" id="mobileNumber" autoComplete="tel" placeholder="09XXXXXXXXX"
                                            value={mobileNumber} onChange={(e) => setMobileNumber(e.target.value)} required />
                                        <Hint show={mobileNumber && !validMobile}>11 digits starting with 09.</Hint>
                                    </label>
                                    <label className={`${styles.field} ${email && !validEmail ? styles.invalid : ''}`} htmlFor="email">
                                        Email (optional)
                                        <input type="email" id="email" autoComplete="email" placeholder="you@email.com"
                                            value={email} onChange={(e) => setEmail(e.target.value)} />
                                        <Hint show={email && !validEmail}>Enter a valid email address, or leave it empty.</Hint>
                                    </label>
                                </div>
                                <label className={`${styles.field} ${!validMessage ? styles.invalid : ''}`} htmlFor="message">
                                    Your question (optional)
                                    <textarea id="message" rows={4} placeholder="e.g. What size fits my beagle? When can I visit?"
                                        value={message} onChange={(e) => setMessage(e.target.value)} />
                                    <Hint show={!validMessage}>Keep it under 500 characters.</Hint>
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
                                <span className={styles.eyebrow}>Your inquiry</span>
                                <div>
                                    <div className={styles.panelName}>{product.name}{chosen ? ` · ${chosen.name}` : ''}</div>
                                    {price
                                        ? <div className={styles.panelPrice}>₱{price.toLocaleString('en-PH')}</div>
                                        : <div className={`${styles.panelPrice} ${styles.panelPriceSmall}`}>Price confirmed when we contact you</div>}
                                    <p className={styles.panelNote}>Face to face only. Nothing to pay online and no delivery.</p>
                                </div>
                                <ol className={styles.next}>
                                    <li>We contact you and arrange a time to meet.</li>
                                    <li>You pay and pick up your unit in person.</li>
                                    <li>We register you and give you your login and serial code.</li>
                                </ol>
                                <div className={styles.panelEnd}>
                                    <p ref={errRef} tabIndex={-1} className={errMsg ? styles.error : ''} role="alert" hidden={!errMsg}>{errMsg}</p>
                                    <button type="submit" form="inquiry" id="sendInquiry" className={`${shellStyles.btn} ${shellStyles.btnWide}`} disabled={!canSubmit}>
                                        {submitting ? 'Sending…' : 'Send inquiry'}
                                    </button>
                                    {appBase && <p className={styles.foot}>Already bought one? <a href={appUrl('/login')}>Log in</a></p>}
                                </div>
                            </div>
                        </aside>
                    </div>
                </div>
            </main>
        </ShopShell>
    );
};
