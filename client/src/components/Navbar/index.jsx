import { Link } from "react-router-dom";
import useAuth from "../../hooks/auth/useAuth";
import { useState } from "react";
import { hasAnyRole } from "../../utils/roles";
import styles from './style.module.css';

export const Navbar = () => {
    const { auth } = useAuth();
    const isAdmin = hasAnyRole(auth, ["admin"]);

    const [headerClass, setHeaderClass] = useState('');
    const menuToggle = () => { headerClass === 'open' ? setHeaderClass('') : setHeaderClass('open'); }
    
    return (
        <header className={`${styles.header} ${headerClass === 'open' ? styles.open : ''}`}>
            <div className={styles.nav__hamburger} onClick={menuToggle}>
                <div></div>
                <div></div>
                <div></div>
            </div>
            
            <ul className={styles.navbar}>
                <li className={styles.logo}><Link to="/">Logo</Link></li>

                <div className={styles.nav__menu}>
                    <li><Link to={isAdmin ? "/admin/dashboard" : "/dashboard"} onClick={menuToggle}>Dashboard</Link></li>
                    {!isAdmin && <li><Link to="/history" onClick={menuToggle}>History</Link></li>}
                    {isAdmin && <li><Link to="/admin/users" onClick={menuToggle}>User Management</Link></li>}
                </div>
            </ul>

            {auth?.username ? <Link className="button" to="/settings">Account</Link> : <Link className="button" to="/login">Log in</Link>}
        </header>
    )
}
