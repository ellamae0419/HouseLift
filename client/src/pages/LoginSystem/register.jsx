import styles from './style.module.css';
import { setTitle } from '../../utils/generalFunctions';
import { useNavigate } from "react-router-dom";

import { useRef, useState, useEffect, useMemo } from "react";
import axios from '../../lib/axios';
import PhilAddress from 'phil-reg-prov-mun-brgy';
import { faEnvelope, faUser } from "@fortawesome/free-regular-svg-icons";
import { faUnlockKeyhole, faEye, faEyeSlash, faIdCard, faLocationDot, faPhone, faHourglassHalf } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

const userRegex = /^[A-z][A-z0-9-_]{3,18}$/;
const emailRegex = /^[a-zA-Z0-9.!#$%&’*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!*@#$%]).{8,24}$/;
const fullNameRegex = /^[A-Za-zÀ-ÿ' -]{2,100}$/;
const mobileRegex = /^09\d{9}$/;

export const Register = () => {
    setTitle();
    const navigate = useNavigate();

    const fullNameRef = useRef();
    const errRef = useRef();

    const [fullName, setFullName] = useState('');
    const [validFullName, setValidFullName] = useState(false);
    const [fullNameFocus, setFullNameFocus] = useState(false);

    const [username, setUsername] = useState('');
    const [validUsername, setValidUsername] = useState(false);
    const [usernameFocus, setUsernameFocus] = useState(false);

    const [email, setEmail] = useState('');
    const [validEmail, setValidEmail] = useState(false);
    const [emailFocus, setEmailFocus] = useState(false);

    const [street, setStreet] = useState('');
    const [provinceCode, setProvinceCode] = useState('');
    const [cityCode, setCityCode] = useState('');
    const [barangayName, setBarangayName] = useState('');
    const [validAddress, setValidAddress] = useState(false);
    const [addressFocus, setAddressFocus] = useState(false);

    const provinceOptions = useMemo(() => PhilAddress.sort(PhilAddress.provinces), []);
    const [cityOptions, setCityOptions] = useState([]);
    const [barangayOptions, setBarangayOptions] = useState([]);

    useEffect(() => {
        setCityCode('');
        setCityOptions(provinceCode ? PhilAddress.sort(PhilAddress.getCityMunByProvince(provinceCode)) : []);
    }, [provinceCode]);

    useEffect(() => {
        setBarangayName('');
        setBarangayOptions(cityCode ? PhilAddress.sort(PhilAddress.getBarangayByMun(cityCode)) : []);
    }, [cityCode]);

    const [mobileNumber, setMobileNumber] = useState('');
    const [validMobile, setValidMobile] = useState(false);
    const [mobileFocus, setMobileFocus] = useState(false);

    const [password, setPassword] = useState('');
    const [validPassword, setValidPassword] = useState(false);
    const [passwordFocus, setPasswordFocus] = useState(false);

    const [matchPassword, setMatchPassword] = useState('');
    const [validMatch, setValidMatch] = useState(false);
    const [matchFocus, setMatchFocus] = useState(false);

    const [errMsg, setErrMsg] = useState('');
    const [success, setSuccess] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    useEffect(() => { fullNameRef.current.focus(); }, [])
    useEffect(() => { setValidFullName(fullNameRegex.test(fullName.trim())); }, [fullName])
    useEffect(() => { setValidUsername(userRegex.test(username)); }, [username])

    useEffect(() => { setValidEmail(emailRegex.test(email)); }, [email])
    useEffect(() => {
        setValidAddress(street.trim().length >= 2 && !!provinceCode && !!cityCode && !!barangayName);
    }, [street, provinceCode, cityCode, barangayName])
    useEffect(() => { setValidMobile(mobileRegex.test(mobileNumber)); }, [mobileNumber])

    useEffect(() => {
        setValidPassword(passwordRegex.test(password));
        setValidMatch(password === matchPassword);
    }, [password, matchPassword])

    useEffect(() => {
        setErrMsg('');
    }, [fullName, username, street, provinceCode, cityCode, barangayName, mobileNumber, password, matchPassword])

    useEffect(() => {
        if (!success) return;

        const timer = setTimeout(() => {
            navigate('/login', { replace: true });
        }, 4000);

        return () => clearTimeout(timer);
    }, [success, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!fullNameRegex.test(fullName.trim()) || !userRegex.test(username) || !validAddress || !mobileRegex.test(mobileNumber) || !passwordRegex.test(password)) {
            return setErrMsg("Please fill in all fields correctly.");
        } // Prevents JS hacks

        const provinceName = provinceOptions.find((p) => p.prov_code === provinceCode)?.name || '';
        const cityName = cityOptions.find((c) => c.mun_code === cityCode)?.name || '';
        const fullAddress = `${street.trim()}, ${barangayName}, ${cityName}, ${provinceName}`;

        try {
            const response = await axios.post('/user/register',
                JSON.stringify({ fullName: fullName.trim(), username, email, address: fullAddress, mobileNumber, password }),
                {
                    headers: { 'Content-Type': 'application/json' },
                    withCredentials: true
                }
            );
            setSuccessMsg(response?.data?.success || 'Account created! An administrator will review and approve your account.');
            setSuccess(true);

            setFullName('');
            setUsername('');
            setEmail('');
            setStreet('');
            setProvinceCode('');
            setMobileNumber('');
            setPassword('');
            setMatchPassword('');
        } catch (err) {
            if(!err?.response) {
                setErrMsg("The server didn't respond.");
                setTimeout(() => { setErrMsg(''); }, 4000)
            } else if(err.response?.status === 409) {
                setErrMsg(err.response?.data?.message);
                setTimeout(() => { setErrMsg(''); }, 4000)
            } else {
                setErrMsg('Registration failed.');
                setTimeout(() => { setErrMsg(''); }, 4000)
            }
            errRef.current.focus();
        }
    }

    return (
        <div className={`${styles.container} container`}>
            {success
                ? <div className={styles.form_container}>
                    <div className={styles.form} style={{textAlign: 'center'}}>
                        <div className={styles.badge} style={{margin: '0 auto 16px', background: 'color-mix(in srgb, var(--main) 16%, transparent)'}}>
                            <FontAwesomeIcon icon={faHourglassHalf} style={{color: 'var(--main)', fontSize: '20px', width: '100%', height: '100%'}} />
                        </div>
                        <h1 className={styles.title} style={{textAlign: 'center'}}>Pending approval</h1>
                        <p className={styles.description} style={{textAlign: 'center'}}>{successMsg} Redirecting you to login...</p>
                    </div>
                  </div>
                : <div className={styles.form_container}>
                    <div className={styles.form}>
                        <form onSubmit={handleSubmit}>
                            <div className={styles.badge}>
                                <img src="/logo.png" alt="HydroLift" className={styles.brand_logo} />
                            </div>
                            <h1 className={styles.title}>Create your account</h1>
                            <p className={styles.description}>Set up HydroLift to start protecting your pet's house from flooding.</p>
                            <p ref={errRef} className={errMsg ? styles.err_message : 'hide'} aria-live="assertive">{errMsg}</p>

                            <div className={styles.field_group}>
                                <label className={styles.field_label} htmlFor="fullName">Full name</label>
                                <div className={`${styles.field_pill} ${fullName && !validFullName ? styles.error : ''}`}>
                                    <FontAwesomeIcon icon={faIdCard} className={styles.field_icon} />
                                    <input
                                        type="text" id="fullName" ref={fullNameRef} autoComplete="off" placeholder='Juan Dela Cruz'
                                        onChange={(e) => setFullName(e.target.value)} required
                                        onFocus={() => setFullNameFocus(true)} onBlur={() => setFullNameFocus(false)}
                                        aria-invalid={validFullName ? "false" :"true"} aria-describedby="fullnamenote"
                                    />
                                </div>
                                <p id="fullnamenote" className={fullNameFocus && fullName && !validFullName ? styles.instructions : "hide"}>
                                    2 to 100 letters (spaces and hyphens allowed).
                                </p>
                            </div>

                            <div className={styles.field_group}>
                                <label className={styles.field_label} htmlFor="username">Username</label>
                                <div className={`${styles.field_pill} ${username && !validUsername ? styles.error : ''}`}>
                                    <FontAwesomeIcon icon={faUser} className={styles.field_icon} />
                                    <input
                                        type="text" id="username" autoComplete="off" placeholder='Choose a username'
                                        onChange={(e) => setUsername(e.target.value)} required
                                        onFocus={() => setUsernameFocus(true)} onBlur={() => setUsernameFocus(false)}
                                        aria-invalid={validUsername ? "false" :"true"} aria-describedby="uidnote"
                                    />
                                </div>
                                <p id="uidnote" className={usernameFocus && username && !validUsername ? styles.instructions : "hide"}>
                                    4 to 24 characters (must begin with a letter).
                                    Letters, numbers, underscores or hyphens.
                                </p>
                            </div>

                            <div className={styles.field_group}>
                                <label className={styles.field_label} htmlFor="email">Email</label>
                                <div className={`${styles.field_pill} ${email && !validEmail ? styles.error : ''}`}>
                                    <FontAwesomeIcon icon={faEnvelope} className={styles.field_icon} />
                                    <input
                                        type="email" id="email" autoComplete="off" placeholder='you@email.com'
                                        onChange={(e) => setEmail(e.target.value)} required
                                        onFocus={() => setEmailFocus(true)} onBlur={() => setEmailFocus(false)}
                                        aria-invalid={validEmail ? "false" :"true"} aria-describedby="emailnote"
                                    />
                                </div>
                                <p id="emailnote" className={emailFocus && email && !validEmail ? styles.instructions : "hide"}>
                                    Must be a valid email.
                                </p>
                            </div>

                            <div className={styles.field_group}>
                                <label className={styles.field_label} htmlFor="street">Street / House no.</label>
                                <div className={`${styles.field_pill} ${street && street.trim().length < 2 ? styles.error : ''}`}>
                                    <FontAwesomeIcon icon={faLocationDot} className={styles.field_icon} />
                                    <input
                                        type="text" id="street" autoComplete="off" placeholder='e.g. 123 Mabini St.'
                                        value={street} onChange={(e) => setStreet(e.target.value)} required
                                        onFocus={() => setAddressFocus(true)} onBlur={() => setAddressFocus(false)}
                                        aria-invalid={street.trim().length >= 2 ? "false" : "true"} aria-describedby="addressnote"
                                    />
                                </div>
                            </div>

                            <div className={styles.field_group}>
                                <label className={styles.field_label} htmlFor="province">Province</label>
                                <div className={styles.field_pill}>
                                    <FontAwesomeIcon icon={faLocationDot} className={styles.field_icon} />
                                    <select
                                        id="province" required value={provinceCode}
                                        onChange={(e) => setProvinceCode(e.target.value)}
                                    >
                                        <option value="" disabled>Select province</option>
                                        {provinceOptions.map((p) => (
                                            <option key={p.prov_code} value={p.prov_code}>{p.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className={styles.field_group}>
                                <label className={styles.field_label} htmlFor="city">City / Municipality</label>
                                <div className={styles.field_pill}>
                                    <FontAwesomeIcon icon={faLocationDot} className={styles.field_icon} />
                                    <select
                                        id="city" required value={cityCode} disabled={!provinceCode}
                                        onChange={(e) => setCityCode(e.target.value)}
                                    >
                                        <option value="" disabled>{provinceCode ? 'Select city / municipality' : 'Select a province first'}</option>
                                        {cityOptions.map((c) => (
                                            <option key={c.mun_code} value={c.mun_code}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className={styles.field_group}>
                                <label className={styles.field_label} htmlFor="barangay">Barangay</label>
                                <div className={styles.field_pill}>
                                    <FontAwesomeIcon icon={faLocationDot} className={styles.field_icon} />
                                    <select
                                        id="barangay" required value={barangayName} disabled={!cityCode}
                                        onChange={(e) => setBarangayName(e.target.value)}
                                        aria-describedby="addressnote"
                                    >
                                        <option value="" disabled>{cityCode ? 'Select barangay' : 'Select a city / municipality first'}</option>
                                        {barangayOptions.map((b) => (
                                            <option key={`${b.mun_code}-${b.name}`} value={b.name}>{b.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <p id="addressnote" className={addressFocus && !validAddress ? styles.instructions : "hide"}>
                                    Fill in the street, then pick province, city/municipality and barangay.
                                </p>
                            </div>

                            <div className={styles.field_group}>
                                <label className={styles.field_label} htmlFor="mobileNumber">Mobile number</label>
                                <div className={`${styles.field_pill} ${mobileNumber && !validMobile ? styles.error : ''}`}>
                                    <FontAwesomeIcon icon={faPhone} className={styles.field_icon} />
                                    <input
                                        type="tel" id="mobileNumber" autoComplete="off" placeholder='09XXXXXXXXX'
                                        onChange={(e) => setMobileNumber(e.target.value)} required
                                        onFocus={() => setMobileFocus(true)} onBlur={() => setMobileFocus(false)}
                                        aria-invalid={validMobile ? "false" :"true"} aria-describedby="mobilenote"
                                    />
                                </div>
                                <p id="mobilenote" className={mobileFocus && mobileNumber && !validMobile ? styles.instructions : "hide"}>
                                    Philippine mobile number: 11 digits starting with 09.
                                </p>
                            </div>

                            <div className={styles.field_group}>
                                <label className={styles.field_label} htmlFor="password">Password</label>
                                <div className={`${styles.field_pill} ${password && !validPassword ? styles.error : ''}`}>
                                    <FontAwesomeIcon icon={faUnlockKeyhole} className={styles.field_icon} />
                                    <input
                                        type={showPassword ? "text" : "password"} id="password" placeholder='At least 8 characters'
                                        onChange={(e) => setPassword(e.target.value)} required
                                        onFocus={() => setPasswordFocus(true)} onBlur={() => setPasswordFocus(false)}
                                        aria-invalid={validPassword ? "false" :"true"} aria-describedby="pwdnote"
                                    />
                                    <button type="button" className={styles.field_toggle} onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? "Hide password" : "Show password"}>
                                        <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
                                    </button>
                                </div>
                                <p id="pwdnote" className={passwordFocus && !validPassword ? styles.instructions : "hide"}>
                                    8 to 24 characters.
                                    Must include uppercase, lowercase letters, a number and a special character (! * @ # $ %).
                                </p>
                            </div>

                            <div className={styles.field_group}>
                                <label className={styles.field_label} htmlFor="password_confirm">Confirm password</label>
                                <div className={`${styles.field_pill} ${matchPassword && !validMatch ? styles.error : ''}`}>
                                    <FontAwesomeIcon icon={faUnlockKeyhole} className={styles.field_icon} />
                                    <input
                                        type={showConfirmPassword ? "text" : "password"} id="password_confirm" placeholder='Re-enter your password'
                                        onChange={(e) => setMatchPassword(e.target.value)} value={matchPassword} required
                                        aria-invalid={validMatch ? "false" : "true"}
                                        aria-describedby="confirmnote"
                                        onFocus={() => setMatchFocus(true)}
                                        onBlur={() => setMatchFocus(false)}
                                    />
                                    <button type="button" className={styles.field_toggle} onClick={() => setShowConfirmPassword((v) => !v)} aria-label={showConfirmPassword ? "Hide password" : "Show password"}>
                                        <FontAwesomeIcon icon={showConfirmPassword ? faEyeSlash : faEye} />
                                    </button>
                                </div>
                                <p id="confirmnote" className={matchFocus && !validMatch ? styles.instructions : "hide"}>
                                    Must match the first password input field.
                                </p>
                            </div>

                            <button
                                className={`${styles.submit_btn} button button-full`}
                                disabled={(!validFullName || !validUsername || !validEmail || !validAddress || !validMobile || !validPassword || !validMatch) ? true : false}
                            >
                                Create account
                            </button>
                        </form>

                        <div className={styles.footer_link}>Already have an account? <a href="/login">Log in</a></div>
                    </div>
                </div>
            }
        </div>
    )
}
