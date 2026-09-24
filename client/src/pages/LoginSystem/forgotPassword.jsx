import styles from './style.module.css';
import { setTitle } from '../../utils/generalFunctions';
import { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from '../../lib/axios';
import { faUser } from "@fortawesome/free-regular-svg-icons";
import { faUnlockKeyhole, faEye, faEyeSlash, faKey } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!*@#$%]).{8,24}$/;

export const ForgotPassword = () => {
    setTitle();
    const navigate = useNavigate();

    const usernameRef = useRef();
    const errRef = useRef();

    const [step, setStep] = useState(1); // 1 = request code, 2 = enter code + new password
    const [usernameOrEmail, setUsernameOrEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [infoMsg, setInfoMsg] = useState('');
    const [errMsg, setErrMsg] = useState('');
    const [success, setSuccess] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [resending, setResending] = useState(false);

    useEffect(() => { usernameRef.current?.focus(); }, []);
    useEffect(() => { setErrMsg(''); }, [usernameOrEmail, otp, newPassword, confirmPassword]);

    useEffect(() => {
        if (!success) return;
        const timer = setTimeout(() => navigate('/login', { replace: true }), 3000);
        return () => clearTimeout(timer);
    }, [success, navigate]);

    const validPassword = passwordRegex.test(newPassword);
    const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

    const handleError = (err) => {
        if (!err?.response) {
            setErrMsg("The server didn't respond.");
        } else {
            setErrMsg(err.response?.data?.message || 'Something went wrong.');
        }
        errRef.current?.focus();
    };

    const requestOtp = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const res = await axios.post('/user/forgot-password', { usernameOrEmail });
            setInfoMsg(res?.data?.message || 'A verification code was sent to your registered mobile number.');
            setStep(2);
        } catch (err) {
            handleError(err);
        } finally {
            setSubmitting(false);
        }
    };

    const resendOtp = async () => {
        setResending(true);
        setOtp('');
        try {
            const res = await axios.post('/user/forgot-password', { usernameOrEmail });
            setInfoMsg(res?.data?.message || 'A new code was sent.');
        } catch (err) {
            handleError(err);
        } finally {
            setResending(false);
        }
    };

    const submitReset = async (e) => {
        e.preventDefault();
        if (!validPassword) { setErrMsg('Password does not meet the requirements.'); return; }
        if (!passwordsMatch) { setErrMsg('Passwords do not match.'); return; }

        setSubmitting(true);
        try {
            await axios.post('/user/reset-password', { usernameOrEmail, otp, newPassword });
            setSuccess(true);
        } catch (err) {
            handleError(err);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className={`${styles.container} container`}>
            <div className={styles.form_container}>
                <div className={styles.form}>
                    {success ? (
                        <div style={{ textAlign: 'center' }}>
                            <div className={styles.badge} style={{ margin: '0 auto 16px' }}>
                                <img src="/logo.png" alt="HydroLift" className={styles.brand_logo} />
                            </div>
                            <h1 className={styles.title}>Password reset</h1>
                            <p className={styles.description}>Your password has been changed. Redirecting you to login...</p>
                        </div>
                    ) : step === 1 ? (
                        <form onSubmit={requestOtp}>
                            <div className={styles.badge}>
                                <img src="/logo.png" alt="HydroLift" className={styles.brand_logo} />
                            </div>
                            <h1 className={styles.title}>Forgot password</h1>
                            <p className={styles.description}>Enter your username, email, or mobile number — we'll send a verification code to your registered mobile number or email.</p>
                            <p ref={errRef} className={errMsg ? styles.err_message : 'hide'} aria-live="assertive">{errMsg}</p>

                            <div className={styles.field_group}>
                                <label className={styles.field_label} htmlFor="usernameOrEmail">Username, email, or mobile number</label>
                                <div className={styles.field_pill}>
                                    <FontAwesomeIcon icon={faUser} className={styles.field_icon} />
                                    <input
                                        type="text" id="usernameOrEmail" ref={usernameRef} autoComplete="off" placeholder='Username, email, or mobile number'
                                        onChange={(e) => setUsernameOrEmail(e.target.value)} value={usernameOrEmail} required
                                    />
                                </div>
                            </div>

                            <button className={`${styles.submit_btn} button button-full`} disabled={!usernameOrEmail || submitting}>
                                {submitting ? 'Sending…' : 'Send code'}
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={submitReset}>
                            <div className={styles.badge}>
                                <img src="/logo.png" alt="HydroLift" className={styles.brand_logo} />
                            </div>
                            <h1 className={styles.title}>Enter code</h1>
                            <p className={styles.description}>{infoMsg}</p>
                            <p ref={errRef} className={errMsg ? styles.err_message : 'hide'} aria-live="assertive">{errMsg}</p>

                            <div className={styles.field_group}>
                                <label className={styles.field_label} htmlFor="otp">Verification code</label>
                                <div className={styles.field_pill}>
                                    <FontAwesomeIcon icon={faKey} className={styles.field_icon} />
                                    <input
                                        type="text" id="otp" inputMode="numeric" autoComplete="one-time-code" placeholder='6-digit code'
                                        onChange={(e) => setOtp(e.target.value)} value={otp} required
                                    />
                                </div>
                            </div>

                            <div className={styles.field_group}>
                                <label className={styles.field_label} htmlFor="newPassword">New password</label>
                                <div className={`${styles.field_pill} ${newPassword && !validPassword ? styles.error : ''}`}>
                                    <FontAwesomeIcon icon={faUnlockKeyhole} className={styles.field_icon} />
                                    <input
                                        type={showPassword ? "text" : "password"} id="newPassword" placeholder='At least 8 characters'
                                        onChange={(e) => setNewPassword(e.target.value)} value={newPassword} required
                                    />
                                    <button type="button" className={styles.field_toggle} onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? "Hide password" : "Show password"}>
                                        <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
                                    </button>
                                </div>
                                <p className={newPassword && !validPassword ? styles.instructions : 'hide'}>
                                    8 to 24 characters. Must include uppercase, lowercase, a number and a special character (! * @ # $ %).
                                </p>
                            </div>

                            <div className={styles.field_group}>
                                <label className={styles.field_label} htmlFor="confirmPassword">Confirm new password</label>
                                <div className={`${styles.field_pill} ${confirmPassword && !passwordsMatch ? styles.error : ''}`}>
                                    <FontAwesomeIcon icon={faUnlockKeyhole} className={styles.field_icon} />
                                    <input
                                        type={showPassword ? "text" : "password"} id="confirmPassword" placeholder='Re-enter new password'
                                        onChange={(e) => setConfirmPassword(e.target.value)} value={confirmPassword} required
                                    />
                                </div>
                            </div>

                            <button className={`${styles.submit_btn} button button-full`} disabled={!otp || !validPassword || !passwordsMatch || submitting}>
                                {submitting ? 'Resetting…' : 'Reset password'}
                            </button>

                            <div className={styles.footer_link} style={{ marginTop: '12px', display: 'flex', justifyContent: 'center', gap: '16px' }}>
                                <button type="button" onClick={resendOtp} disabled={resending} style={{ background: 'none', border: 'none', color: 'var(--main)', cursor: 'pointer', fontSize: 'inherit', padding: 0 }}>
                                    {resending ? 'Resending…' : 'Resend code'}
                                </button>
                                <span>·</span>
                                <button type="button" onClick={() => setStep(1)} style={{ background: 'none', border: 'none', color: 'var(--main)', cursor: 'pointer', fontSize: 'inherit', padding: 0 }}>
                                    Use a different account
                                </button>
                            </div>
                        </form>
                    )}

                    {!success && (
                        <div className={styles.footer_link}>Remembered your password? <a href="/login">Log in</a></div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;
