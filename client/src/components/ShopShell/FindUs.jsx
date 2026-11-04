import styles from './shell.module.css';
import { CONTACT } from '../../config/shopContact';

const PinIcon = () => (
    <svg className={styles.findIcon} viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
        <path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5Z" />
    </svg>
);
const MailIcon = () => (
    <svg className={styles.findIcon} viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="m4 7 8 6 8-6" />
    </svg>
);
const PhoneIcon = () => (
    <svg className={styles.findIcon} viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z" />
    </svg>
);

// True when at least one detail is filled in on config/shopContact.js.
export const hasFindUs = Boolean(CONTACT.location || CONTACT.email || CONTACT.phone || CONTACT.hours);

// The shop's address and contact details. Only what is filled in on config/shopContact.js is shown.
export const FindUsList = () => (
    <div className={styles.findList}>
        {CONTACT.location && (
            <div className={styles.findRow}>
                <PinIcon />
                <div><span className={styles.findLabel}>Main Office and Showroom:</span><span className={styles.findValue}>{CONTACT.location}</span></div>
            </div>
        )}
        {CONTACT.email && (
            <div className={styles.findRow}>
                <MailIcon />
                <div><span className={styles.findLabel}>Email:</span><a className={styles.findValue} href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a></div>
            </div>
        )}
        {CONTACT.phone && (
            <div className={styles.findRow}>
                <PhoneIcon />
                <div><span className={styles.findLabel}>Phone:</span><span className={styles.findValue}>{CONTACT.phone}</span></div>
            </div>
        )}
        {CONTACT.hours && <p className={styles.findHours}><span className={styles.findLabel}>Operating hours:</span>{CONTACT.hours}</p>}
    </div>
);
