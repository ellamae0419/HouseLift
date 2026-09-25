import styles from './style.module.css';
import { setTitle } from '../../utils/generalFunctions';

import { useRef, useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import axios from '../../lib/axios';
import useAuth from '../../hooks/auth/useAuth';
import { faUser } from "@fortawesome/free-regular-svg-icons";
import { faUnlockKeyhole, faEye, faEyeSlash } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

export const Login = () => {
    setTitle();

    const { setAuth, persist, setPersist } = useAuth();
    
    const navigate = useNavigate();
    const location = useLocation();
    const redirection = location.state?.from?.pathname || '/';

    const usernameOrEmailRef = useRef();
    const errRef = useRef();

    // "Remember me" pre-fills these from localStorage on the next visit —
    // note this stores the password in plaintext client-side storage (the
    // user explicitly asked for both fields remembered, not just the
    // username, after being told the risk on a shared/public device).
    const remembered = JSON.parse(persist) ? JSON.parse(localStorage.getItem('rememberedCredentials') || 'null') : null;
    const [usernameOrEmail, setUsernameOrEmail] = useState(remembered?.usernameOrEmail || '');
    const [password, setPassword] = useState(remembered?.password || '');
    const [errMsg, setErrMsg] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => { usernameOrEmailRef.current.focus(); }, [])
    useEffect(() => { setErrMsg(''); }, [usernameOrEmail, password])

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            const response = await axios.post('/user/login',
                JSON.stringify({ usernameOrEmail, password }),
                {
                    headers: { 'Content-Type': 'application/json' },
                    withCredentials: true
                }
            );
            const accessToken = response?.data?.accessToken;
            const username = response?.data?.username;
            const email = response?.data?.email;
            setAuth({ username, email, accessToken });

            if (JSON.parse(persist)) {
                localStorage.setItem('rememberedCredentials', JSON.stringify({ usernameOrEmail, password }));
            } else {
                localStorage.removeItem('rememberedCredentials');
            }

            setUsernameOrEmail('');
            setPassword('');
            navigate(redirection, { replace: true }); // We redirect to the previous page
        } catch (err) {
            if(!err?.response) {
                setErrMsg("The server didn't respond.");
                setTimeout(() => { setErrMsg(''); }, 4000)
            } else if([400, 401, 403].includes(err.response?.status)) {
                setErrMsg(err.response?.data?.message);
                setTimeout(() => { setErrMsg(''); }, 4000)
            } else {
                setErrMsg('Login failed.');
                setTimeout(() => { setErrMsg(''); }, 4000)
            }
            errRef.current.focus();
        }
    }

    const togglePersist = () => { setPersist(prev => !prev); }

    useEffect(() => {
        localStorage.setItem('persist', persist);
    }, [persist])

    return (
        <div className={`${styles.container} container`}>
            <div className={styles.form_container}>
                <div className={styles.form}>
                    <form onSubmit={handleSubmit}>
                        <div className={styles.badge}>
                            <img src="/logo.png" alt="HydroLift" className={styles.brand_logo} />
                        </div>
                        <h1 className={styles.title}>Welcome</h1>
                        <p className={styles.description}>Log in to your HydroLift control panel.</p>
                        <p ref={errRef} className={errMsg ? styles.err_message : 'hide'} aria-live="assertive">{errMsg}</p>

                        <div className={styles.field_group}>
                            <label className={styles.field_label} htmlFor="usernameOrEmail">Username or email</label>
                            <div className={styles.field_pill}>
                                <FontAwesomeIcon icon={faUser} className={styles.field_icon} />
                                <input
                                    type="text" id="usernameOrEmail" ref={usernameOrEmailRef} autoComplete="off" placeholder='Your username or email'
                                    onChange={(e) => setUsernameOrEmail(e.target.value)} value={usernameOrEmail} required
                                />
                            </div>
                        </div>

                        <div className={styles.field_group}>
                            <label className={styles.field_label} htmlFor="password">Password</label>
                            <div className={styles.field_pill}>
                                <FontAwesomeIcon icon={faUnlockKeyhole} className={styles.field_icon} />
                                <input
                                    type={showPassword ? "text" : "password"} id="password" placeholder='Your password'
                                    onChange={(e) => setPassword(e.target.value)} value={password} required
                                />
                                <button type="button" className={styles.field_toggle} onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? "Hide password" : "Show password"}>
                                    <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
                                </button>
                            </div>
                        </div>

                        <div style={{marginTop: '18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                            <div style={{display: 'flex', alignItems: 'center'}}>
                                <input type="checkbox" id="persist_checkBox" className={styles.checkBox} onChange={togglePersist} checked={JSON.parse(persist)} />
                                <label htmlFor='persist_checkBox' style={{fontSize: '13px', color: 'var(--text-low)'}}>Remember me</label>
                            </div>
                            <Link to="/forgot-password" style={{fontSize: '13px'}}>Forgot password?</Link>
                        </div>

                        <button className={`${styles.submit_btn} button button-full`} disabled={(!usernameOrEmail || !password) ? true : false}>
                            Sign in
                        </button>
                    </form>

                    <div className={styles.footer_link}>You don't have an account? <Link to="/register">Register</Link></div>
                </div>
            </div>
        </div>
    )
}
