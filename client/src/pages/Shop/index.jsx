import styles from './style.module.css';
import { setTitle } from '../../utils/generalFunctions';
import { appBase, appUrl } from '../../utils/siteLinks';
import { ShopShell } from '../../components/ShopShell/index';
import shellStyles from '../../components/ShopShell/shell.module.css';
import { Link, useSearchParams } from 'react-router-dom';
import { SIZES, sizeByValue } from '../../config/shopSizes';

import { useRef, useState, useEffect, useMemo } from "react";
import axios from '../../lib/axios';
import PhilAddress from 'phil-reg-prov-mun-brgy';

const userRegex = /^[A-Za-z][A-Za-z0-9_-]{3,18}$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!*@#$%]).{8,24}$/;
const fullNameRegex = /^[A-Za-zÀ-ÿ' -]{2,100}$/;
const mobileRegex = /^09\d{9}$/;

const MAX_SIDE = 1400;
const MAX_DATA_URL_LENGTH = 2_000_000;

const loadImage = (file) => new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('unreadable')); };
    img.src = url;
});

// Phone photos are several MB. Shrinking in the browser keeps the upload quick
// on mobile data and well under the server's size limit.
const prepareIdPhoto = async (file) => {
    if (!file.type.startsWith('image/')) throw new Error('not-image');
    const img = await loadImage(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(img.width, img.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    let quality = 0.85;
    let dataUrl = canvas.toDataURL('image/jpeg', quality);
    while (dataUrl.length > MAX_DATA_URL_LENGTH && quality > 0.4) {
        quality -= 0.1;
        dataUrl = canvas.toDataURL('image/jpeg', quality);
    }
    if (dataUrl.length > MAX_DATA_URL_LENGTH) throw new Error('too-big');
    return dataUrl;
};

const Hint = ({ show, children }) => (show ? <span className={`${styles.hint} ${styles.hintBad}`}>{children}</span> : null);

export const Shop = () => {
    setTitle('Order HydroLift');

    const errRef = useRef();

    const [product, setProduct] = useState({ name: 'HydroLift', price: null, sizes: [], idTypes: [] });

    // The product page's "Order now" buttons open this form with a size already chosen.
    const [params] = useSearchParams();
    const [size, setSize] = useState(() => {
        const wanted = (params.get('size') || '').toUpperCase();
        return sizeByValue(wanted) ? wanted : '';
    });

    const [fullName, setFullName] = useState('');
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [mobileNumber, setMobileNumber] = useState('');
    const [password, setPassword] = useState('');
    const [matchPassword, setMatchPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const [street, setStreet] = useState('');
    const [provinceCode, setProvinceCode] = useState('');
    const [cityCode, setCityCode] = useState('');
    const [barangayName, setBarangayName] = useState('');
    // The address data lists Manila twice under one code, which would repeat it in the
    // dropdown, so keep each code once.
    const provinceOptions = useMemo(
        () => PhilAddress.sort(PhilAddress.provinces).filter((p, i, all) => all.findIndex((q) => q.prov_code === p.prov_code) === i),
        []
    );
    const [cityOptions, setCityOptions] = useState([]);
    const [barangayOptions, setBarangayOptions] = useState([]);

    const [idType, setIdType] = useState('');
    const [idImage, setIdImage] = useState('');
    const [idBusy, setIdBusy] = useState(false);
    const [consent, setConsent] = useState(false);

    const [errMsg, setErrMsg] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [orderId, setOrderId] = useState(null);

    useEffect(() => {
        let mounted = true;
        axios.get('/shop/product')
            .then((res) => { if (mounted) setProduct(res.data); })
            .catch(() => { /* the form still works without the price and ID list */ });
        return () => { mounted = false; };
    }, []);

    useEffect(() => {
        setCityCode('');
        setCityOptions(provinceCode ? PhilAddress.sort(PhilAddress.getCityMunByProvince(provinceCode)) : []);
    }, [provinceCode]);

    useEffect(() => {
        setBarangayName('');
        setBarangayOptions(cityCode ? PhilAddress.sort(PhilAddress.getBarangayByMun(cityCode)) : []);
    }, [cityCode]);

    useEffect(() => { setErrMsg(''); }, [size, fullName, username, email, mobileNumber, street, provinceCode, cityCode, barangayName, password, matchPassword, idType, idImage, consent]);

    const validFullName = fullNameRegex.test(fullName.trim());
    const validUsername = userRegex.test(username);
    const validEmail = emailRegex.test(email);
    const validMobile = mobileRegex.test(mobileNumber);
    const validAddress = street.trim().length >= 2 && !!provinceCode && !!cityCode && !!barangayName;
    const validPassword = passwordRegex.test(password);
    const validMatch = password === matchPassword;
    const chosen = sizeByValue(size);
    // A price set for this size wins, then the one price for every size, then none.
    const price = product.sizes?.find((x) => x.value === size)?.price ?? product.price;
    const canSubmit = !!chosen && validFullName && validUsername && validEmail && validMobile && validAddress
        && validPassword && validMatch && !!idType && !!idImage && consent && !idBusy && !submitting;

    const handleFile = async (e) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        setIdBusy(true);
        try {
            setIdImage(await prepareIdPhoto(file));
        } catch (err) {
            setIdImage('');
            setErrMsg(err.message === 'too-big'
                ? 'That photo is too large. Take a smaller one and try again.'
                : "We couldn't read that file. Upload a JPG or PNG photo of your ID.");
        } finally {
            setIdBusy(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!canSubmit) return setErrMsg('Please fill in every field correctly.');

        const provinceName = provinceOptions.find((p) => p.prov_code === provinceCode)?.name || '';
        const cityName = cityOptions.find((c) => c.mun_code === cityCode)?.name || '';
        const address = `${street.trim()}, ${barangayName}, ${cityName}, ${provinceName}`;

        setSubmitting(true);
        try {
            const res = await axios.post('/shop/orders', {
                size, fullName: fullName.trim(), username, email, mobileNumber, address, password, idType, idImage, consent,
            }, { timeout: 60000 });
            setOrderId(res?.data?.orderId ?? 0);
            setPassword('');
            setMatchPassword('');
            setIdImage('');
        } catch (err) {
            if (!err?.response) setErrMsg("The server didn't respond. Check your connection and try again.");
            else setErrMsg(err.response?.data?.message || 'We could not place your order.');
            errRef.current?.focus();
        } finally {
            setSubmitting(false);
        }
    };

    if (orderId !== null) {
        return (
            <ShopShell>
                <main className={styles.page}>
                    <div className={styles.wrap}>
                        <div className={styles.done}>
                            <div className={styles.doneMark}>
                                <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="#182d44" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
                            </div>
                            <h1>Order received</h1>
                            <p>{orderId ? `Your order number is #${orderId}. ` : ''}{chosen ? `You ordered a ${chosen.name} HydroLift. ` : ''}We will check your ID and contact you.</p>
                            <ol className={styles.doneSteps}>
                                <li>We check your ID. You can log in once it is approved.</li>
                                <li>You pay in person when you receive your HydroLift.</li>
                                <li>We give you a serial code with your unit.</li>
                                <li>Log in and enter the serial code to link the unit to your account.</li>
                            </ol>
                            <div className={styles.doneAction}>
                                {appBase
                                    ? <a href={appUrl('/login')} className={shellStyles.btn}>Go to login</a>
                                    : <Link to="/" className={shellStyles.btn}>Back to the shop</Link>}
                            </div>
                        </div>
                    </div>
                </main>
            </ShopShell>
        );
    }

    return (
        <ShopShell>
            <main className={styles.page} id="order-form">
                <div className={styles.wrap}>
                    <span className={styles.eyebrow}>Order form</span>
                    <h1 className={styles.title}>Order your HydroLift</h1>
                    <p className={styles.intro}>Fill in your details and upload a valid ID. You pay in person when you receive your unit.</p>

                    <div className={styles.box}>
                        <form className={styles.fields} id="order" onSubmit={handleSubmit} noValidate>
                            <div className={styles.group}>
                                <h2 className={styles.groupTitle}>Choose a size</h2>
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
                                <span className={styles.hint}>Your pet should be able to stand, turn around and lie fully stretched out inside. If your pet is between sizes, choose the larger one.</span>
                            </div>

                            <div className={styles.group}>
                                <h2 className={styles.groupTitle}>Your details</h2>
                                <label className={`${styles.field} ${fullName && !validFullName ? styles.invalid : ''}`} htmlFor="fullName">
                                    Full name (as on your ID)
                                    <input type="text" id="fullName" autoComplete="name" placeholder="Juan Dela Cruz"
                                        value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                                    <Hint show={fullName && !validFullName}>Use letters only, 2 to 100 characters.</Hint>
                                </label>
                                <div className={styles.row2}>
                                    <label className={`${styles.field} ${username && !validUsername ? styles.invalid : ''}`} htmlFor="username">
                                        Username
                                        <input type="text" id="username" autoComplete="username" placeholder="Choose a username"
                                            value={username} onChange={(e) => setUsername(e.target.value)} required />
                                        <Hint show={username && !validUsername}>4 to 19 characters, starting with a letter. Letters, numbers, _ or -.</Hint>
                                    </label>
                                    <label className={`${styles.field} ${mobileNumber && !validMobile ? styles.invalid : ''}`} htmlFor="mobileNumber">
                                        Mobile number
                                        <input type="tel" id="mobileNumber" autoComplete="tel" placeholder="09XXXXXXXXX"
                                            value={mobileNumber} onChange={(e) => setMobileNumber(e.target.value)} required />
                                        <Hint show={mobileNumber && !validMobile}>11 digits starting with 09. Flood texts go here.</Hint>
                                    </label>
                                </div>
                                <label className={`${styles.field} ${email && !validEmail ? styles.invalid : ''}`} htmlFor="email">
                                    Email
                                    <input type="email" id="email" autoComplete="email" placeholder="you@email.com"
                                        value={email} onChange={(e) => setEmail(e.target.value)} required />
                                    <Hint show={email && !validEmail}>Enter a valid email address.</Hint>
                                </label>
                            </div>

                            <div className={styles.group}>
                                <h2 className={styles.groupTitle}>Delivery address</h2>
                                <label className={`${styles.field} ${street && street.trim().length < 2 ? styles.invalid : ''}`} htmlFor="street">
                                    Street / house no.
                                    <input type="text" id="street" autoComplete="street-address" placeholder="e.g. 123 Mabini St."
                                        value={street} onChange={(e) => setStreet(e.target.value)} required />
                                </label>
                                <label className={styles.field} htmlFor="province">
                                    Province
                                    <select id="province" required value={provinceCode} onChange={(e) => setProvinceCode(e.target.value)}>
                                        <option value="" disabled>Select province</option>
                                        {provinceOptions.map((p) => <option key={p.prov_code} value={p.prov_code}>{p.name}</option>)}
                                    </select>
                                </label>
                                <div className={styles.row2}>
                                    <label className={styles.field} htmlFor="city">
                                        City / Municipality
                                        <select id="city" required value={cityCode} disabled={!provinceCode} onChange={(e) => setCityCode(e.target.value)}>
                                            <option value="" disabled>{provinceCode ? 'Select city / municipality' : 'Select a province first'}</option>
                                            {cityOptions.map((c) => <option key={c.mun_code} value={c.mun_code}>{c.name}</option>)}
                                        </select>
                                    </label>
                                    <label className={styles.field} htmlFor="barangay">
                                        Barangay
                                        <select id="barangay" required value={barangayName} disabled={!cityCode} onChange={(e) => setBarangayName(e.target.value)}>
                                            <option value="" disabled>{cityCode ? 'Select barangay' : 'Select a city first'}</option>
                                            {barangayOptions.map((b, i) => <option key={`${b.mun_code}-${i}`} value={b.name}>{b.name}</option>)}
                                        </select>
                                    </label>
                                </div>
                            </div>

                            <div className={styles.group}>
                                <h2 className={styles.groupTitle}>Your login</h2>
                                <label className={`${styles.field} ${password && !validPassword ? styles.invalid : ''}`} htmlFor="password">
                                    Password
                                    <span className={styles.pwWrap}>
                                        <input type={showPassword ? 'text' : 'password'} id="password" autoComplete="new-password" placeholder="At least 8 characters"
                                            value={password} onChange={(e) => setPassword(e.target.value)} required />
                                        <button type="button" className={styles.toggle} onClick={() => setShowPassword((v) => !v)}>{showPassword ? 'Hide' : 'Show'}</button>
                                    </span>
                                    <Hint show={password && !validPassword}>8 to 24 characters with an uppercase letter, a lowercase letter, a number and a special character (! * @ # $ %).</Hint>
                                </label>
                                <label className={`${styles.field} ${matchPassword && !validMatch ? styles.invalid : ''}`} htmlFor="password_confirm">
                                    Confirm password
                                    <input type={showPassword ? 'text' : 'password'} id="password_confirm" autoComplete="new-password" placeholder="Re-enter your password"
                                        value={matchPassword} onChange={(e) => setMatchPassword(e.target.value)} required />
                                    <Hint show={matchPassword && !validMatch}>The passwords do not match.</Hint>
                                </label>
                            </div>

                            <div className={styles.group}>
                                <h2 className={styles.groupTitle}>Valid ID</h2>
                                <label className={styles.field} htmlFor="idType">
                                    Type of ID
                                    <select id="idType" required value={idType} onChange={(e) => setIdType(e.target.value)}>
                                        <option value="" disabled>Select the ID you will upload</option>
                                        {product.idTypes.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                                    </select>
                                </label>
                                <div className={styles.field}>
                                    Photo of your ID
                                    <label className={styles.drop} htmlFor="idPhoto">
                                        <input id="idPhoto" type="file" accept="image/*" onChange={handleFile} />
                                        <strong>{idBusy ? 'Preparing photo…' : idImage ? 'Choose a different photo' : 'Tap to take or choose a photo'}</strong>
                                        <span>The whole ID should be visible, flat and readable.</span>
                                    </label>
                                    {idImage && (
                                        <div className={styles.idPreview}>
                                            <img src={idImage} alt="Preview of your uploaded ID" />
                                            <button type="button" className={styles.linkBtn} onClick={() => setIdImage('')}>Remove photo</button>
                                        </div>
                                    )}
                                </div>
                                <label className={styles.consent} htmlFor="consent">
                                    <input id="consent" type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
                                    <span>I agree that HydroLift may keep my ID photo and details to verify who I am. Only HydroLift administrators can see my ID.</span>
                                </label>
                            </div>
                        </form>

                        <aside className={styles.panel} aria-label="Your order">
                            <div className={styles.panelInner}>
                                <span className={styles.eyebrow}>Your order</span>
                                <div>
                                    <div className={styles.panelName}>{product.name}{chosen ? ` · ${chosen.name}` : ''}</div>
                                    {!chosen && <p className={styles.panelNote}>Choose a size to continue.</p>}
                                    {price
                                        ? <div className={styles.panelPrice}>₱{price.toLocaleString('en-PH')}</div>
                                        : <div className={`${styles.panelPrice} ${styles.panelPriceSmall}`}>Price confirmed when we contact you</div>}
                                    <p className={styles.panelNote}>Paid in person. Nothing to pay online.</p>
                                </div>
                                <ol className={styles.next}>
                                    <li>We check your ID and approve your order.</li>
                                    <li>You pay in person and receive your unit with a serial code.</li>
                                    <li>You log in and enter the serial code.</li>
                                </ol>
                                <div className={styles.panelEnd}>
                                    <p ref={errRef} tabIndex={-1} className={errMsg ? styles.error : ''} role="alert" hidden={!errMsg}>{errMsg}</p>
                                    <button type="submit" form="order" id="placeOrder" className={`${shellStyles.btn} ${shellStyles.btnWide}`} disabled={!canSubmit}>
                                        {submitting ? 'Placing your order…' : 'Place order'}
                                    </button>
                                    {appBase && <p className={styles.foot}>Already have an account? <a href={appUrl('/login')}>Log in</a></p>}
                                </div>
                            </div>
                        </aside>
                    </div>
                </div>
            </main>
        </ShopShell>
    );
};

export default Shop;
