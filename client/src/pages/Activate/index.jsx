import styles from '../LoginSystem/style.module.css';
import { setTitle } from '../../utils/generalFunctions';
import { Navigate, useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { faKey } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import useAuth from '../../hooks/auth/useAuth';
import useAxiosPrivate from '../../hooks/auth/useAxiosPrivate';
import useRefreshToken from '../../hooks/auth/useRefreshToken';
import useLogout from '../../hooks/auth/useLogout';
import { hasAnyRole, isActivated } from '../../utils/roles';

// Letters and digits only, shown as HL-XXXX-XXXX-XXXX while typing. The server
// accepts it with or without dashes; this only makes it easier to read back.
const formatSerial = (raw) => {
    const clean = raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 14);
    const parts = [clean.slice(0, 2), clean.slice(2, 6), clean.slice(6, 10), clean.slice(10, 14)].filter(Boolean);
    return parts.join('-');
};

export const Activate = () => {
    setTitle('Activate your HydroLift');
    const { auth } = useAuth();
    const axiosPrivate = useAxiosPrivate();
    const refresh = useRefreshToken();
    const logout = useLogout();
    const navigate = useNavigate();
    const inputRef = useRef();

    const [serial, setSerial] = useState('');
    const [errMsg, setErrMsg] = useState('');
    const [busy, setBusy] = useState(false);

    useEffect(() => { inputRef.current?.focus(); }, []);
    useEffect(() => { setErrMsg(''); }, [serial]);

    // Admins and already-activated customers have nothing to do here.
    if (hasAnyRole(auth, ['admin']) || isActivated(auth)) return <Navigate to="/" replace />;

    const ready = serial.replace(/-/g, '').length === 14;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!ready || busy) return;
        setBusy(true);
        try {
            await axiosPrivate.post('/users/activate', { serial });
            // The login token still says "not activated"; get a fresh one.
            await refresh();
            navigate('/dashboard', { replace: true });
        } catch (err) {
            setErrMsg(!err?.response
                ? "The server didn't respond. Check your connection and try again."
                : err.response?.data?.message || 'We could not activate your HydroLift.');
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className={`${styles.container} container`}>
            <div className={styles.form_container}>
                <div className={styles.form}>
                    <form onSubmit={handleSubmit}>
                        <div className={styles.badge}>
                            <img src="/logo.png" alt="HydroLift" className={styles.brand_logo} />
                        </div>
                        <h1 className={styles.title}>Activate your HydroLift</h1>
                        <p className={styles.description}>
                            Enter the serial code you received with your unit. This confirms you own it and links it to your account.
                        </p>
                        <p className={errMsg ? styles.err_message : 'hide'} aria-live="assertive">{errMsg}</p>

                        <div className={styles.field_group}>
                            <label className={styles.field_label} htmlFor="serial">Serial code</label>
                            <div className={styles.field_pill}>
                                <FontAwesomeIcon icon={faKey} className={styles.field_icon} />
                                <input
                                    type="text" id="serial" ref={inputRef} autoComplete="off" autoCapitalize="characters" spellCheck="false"
                                    className={styles.big_code} placeholder="HL-XXXX-XXXX-XXXX" maxLength={17}
                                    value={serial} onChange={(e) => setSerial(formatSerial(e.target.value))} required
                                />
                            </div>
                        </div>

                        <button className={`${styles.submit_btn} button button-full`} disabled={!ready || busy}>
                            {busy ? 'Checking…' : 'Activate'}
                        </button>
                    </form>

                    <div className={styles.footer_link}>
                        Don&apos;t have a code yet? We give it to you when you pay for and receive your unit.
                    </div>
                    <div className={styles.footer_link}>
                        <button type="button" className={styles.link_btn} onClick={logout}>Log out</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Activate;
