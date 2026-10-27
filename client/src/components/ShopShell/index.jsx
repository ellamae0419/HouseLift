import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import styles from './shell.module.css';
import { appBase, appUrl } from '../../utils/siteLinks';
import { CONTACT } from '../../config/shopContact';

export const LogoMark = ({ light = false }) => (
    <svg viewBox="0 0 34 34" aria-hidden="true">
        <rect width="34" height="34" rx="9" fill={light ? '#7fd1cc' : '#17676b'} />
        <path d="M17 6 7 14h2.5v7h15v-7H27z" fill={light ? '#182d44' : '#fff'} />
        <rect x="11" y="21" width="2.2" height="7" fill="#f2a516" />
        <rect x="20.8" y="21" width="2.2" height="7" fill="#f2a516" />
        {!light && <path d="M14.5 21v-3.2a2.5 2.5 0 0 1 5 0V21z" fill="#17676b" />}
    </svg>
);

// Every page of the shop is its own address, so the menu opens one page at a time.
const PAGES = [
    { to: '/about', label: 'About' },
    { to: '/product', label: 'Product' },
    { to: '/how-it-works', label: 'How it works' },
    { to: '/specifications', label: 'Specifications' },
    { to: '/faq', label: 'FAQ' },
    { to: '/contact', label: 'Contact' },
];

const Brand = ({ light }) => (
    <Link className={styles.logo} to="/" aria-label="HydroLift home">
        <LogoMark light={light} />
        <span>HydroLift<small>Flood-lift pet house</small></span>
    </Link>
);

// The frame every shop page sits in: top bar, header with the menu, and the footer.
export const ShopShell = ({ children }) => {
    const [open, setOpen] = useState(false);
    const { pathname } = useLocation();

    // Close the phone menu and start the new page at the top.
    useEffect(() => {
        setOpen(false);
        window.scrollTo({ top: 0, behavior: 'instant' });
    }, [pathname]);

    const linkClass = ({ isActive }) => (isActive ? styles.active : undefined);

    return (
        <>
            <div className={styles.topbar}>
                <div className={styles.wrap}>
                    <span>Sold face to face only. Send an inquiry, then pay and pick up in person.</span>
                    {CONTACT.phone
                        ? <span>Call or Viber <b>{CONTACT.phone}</b></span>
                        : appBase && <span>Already a customer? <a href={appUrl('/login?fresh=1')}>Log in</a></span>}
                </div>
            </div>

            <header className={styles.header}>
                <div className={styles.wrap}>
                    <Brand />
                    <div className={styles.right}>
                        <nav id="site-menu" className={`${styles.menu} ${open ? styles.menuOpen : ''}`} aria-label="Main">
                            {PAGES.map((p) => <NavLink key={p.to} to={p.to} className={linkClass}>{p.label}</NavLink>)}
                            {appBase && <a href={appUrl('/login?fresh=1')}>Log in</a>}
                        </nav>
                        <Link to="/inquire" className={styles.btn}>Inquire now</Link>
                        <button
                            type="button" className={styles.menuBtn} aria-expanded={open} aria-controls="site-menu"
                            onClick={() => setOpen((v) => !v)}
                        >
                            {open ? 'Close' : 'Menu'}
                        </button>
                    </div>
                </div>
            </header>

            {children}

            <footer className={styles.footer}>
                <div className={`${styles.wrap} ${styles.cols}`}>
                    <div>
                        <Brand light />
                        <p className={styles.about}>A pet house that lifts itself above floodwater, with text alerts and a dashboard for the owner.</p>
                    </div>
                    <div>
                        <h4>Shop</h4>
                        <ul>
                            <li><Link to="/product">Product</Link></li>
                            <li><Link to="/specifications">Specifications</Link></li>
                            <li><Link to="/how-it-works">How to buy</Link></li>
                            <li><Link to="/inquire">Ask a question</Link></li>
                        </ul>
                    </div>
                    <div>
                        <h4>Contact</h4>
                        <ul>
                            {CONTACT.phone && <li>Viber / mobile<br /><b>{CONTACT.phone}</b></li>}
                            {CONTACT.facebook && <li>Facebook<br /><b>{CONTACT.facebook}</b></li>}
                            {CONTACT.email && <li>Email<br /><b>{CONTACT.email}</b></li>}
                            {!CONTACT.phone && !CONTACT.facebook && !CONTACT.email && (
                                <li>Send an inquiry and we will contact you on the mobile number you give.</li>
                            )}
                        </ul>
                    </div>
                    <div>
                        <h4>{CONTACT.location ? 'Showroom' : 'Your account'}</h4>
                        <ul>
                            {CONTACT.location && <li>{CONTACT.location}</li>}
                            {CONTACT.hours && <li>{CONTACT.hours}</li>}
                            {appBase && <li><a href={appUrl('/login?fresh=1')}>Log in</a></li>}
                            {appBase && <li><a href={appUrl('/forgot-password')}>Forgot your password?</a></li>}
                        </ul>
                    </div>
                </div>
                <div className={styles.legal}>
                    <div className={styles.wrap}>
                        <span>© {new Date().getFullYear()} HydroLift</span>
                        <span>Face to face only. Pay and pick up in person.</span>
                    </div>
                </div>
            </footer>
        </>
    );
};

export default ShopShell;
