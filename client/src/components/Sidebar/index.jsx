import { Link, NavLink } from "react-router-dom";
import useAuth from "../../hooks/auth/useAuth";
import useNotifications from "../../hooks/useNotifications";
import useLogout from "../../hooks/auth/useLogout";
import { hasAnyRole, getRolesFromAuth } from "../../utils/roles";
import "./index.css";

const userNavItems = [
    {
        to: "/dashboard",
        label: "Dashboard",
        end: true,
        icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
        ),
    },
    {
        to: "/history",
        label: "Event History",
        icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
            </svg>
        ),
    },
    {
        to: "/settings",
        label: "Settings",
        icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
        ),
    },
    {
        to: "/notifications",
        label: "Notifications and alerts",
        icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
        ),
    },
];

const adminNavItems = [
    {
        to: "/admin/dashboard",
        label: "Dashboard / System overview",
        end: true,
        icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            </svg>
        ),
    },
    {
        to: "/admin/house-monitoring",
        label: "Flood monitoring",
        icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2s7 8.5 7 13a7 7 0 0 1-14 0c0-4.5 7-13 7-13z" />
            </svg>
        ),
    },
    {
        to: "/admin/maintenance",
        label: "Maintenance",
        icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1v4" />
                <path d="M4 7h16v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7z" />
                <path d="M8 11h8M8 15h8" />
            </svg>
        ),
    },
    {
        to: "/admin/users",
        label: "User management",
        icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
        ),
    },
    {
        to: "/settings",
        label: "Settings",
        icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
        ),
    },
    {
        to: "/notifications",
        label: "Notifications and alerts",
        icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
        ),
    },
];

export const Sidebar = ({ open = false, onClose = () => {} }) => {
    const { auth } = useAuth();
    const { unreadCount } = useNotifications();
    const logout = useLogout();
    const username = auth?.username || '';
    const isAdmin = hasAnyRole(auth, ["admin"]);
    const roleText = getRolesFromAuth(auth).join(', ') || 'user';
    const navItems = isAdmin ? adminNavItems : userNavItems;
    return (
        <>
            <aside className={`sidebar ${open ? "is-active" : ""}`}>

                <div className="sidebar-header">
                    <Link className="sidebar-brand" to={isAdmin ? "/admin/dashboard" : "/dashboard"} aria-label="Go to dashboard">
                        <div className="sidebar-brand-icon">
                            <img src="/logo.png" alt="" className="sidebar-brand-logo" />
                        </div>
                        <span className="sidebar-brand-name">HydroLift</span>
                    </Link>
                    <button
                        type="button"
                        onClick={onClose}
                        className="toggle-btn sidebar-close-btn"
                        id="toggleBtn"
                        aria-label="Close sidebar"
                    >
                        ×
                    </button>
                </div>

                <ul className="sidebar-nav">
                    {navItems.map((item) => (
                        <li key={item.to}>
                            <NavLink
                                to={item.to}
                                end={item.end}
                                className={({ isActive }) =>
                                    `nav-item sidebar-link${isActive ? " active" : ""}`
                                }
                            >
                                <span className="nav-icon">{item.icon}</span>
                                <span className="nav-label">{item.label}</span>
                                {item.to === "/notifications" && unreadCount > 0 && (
                                    <span className="nav-badge">{unreadCount}</span>
                                )}
                            </NavLink>
                        </li>
                    ))}
                    <li className="sidebar-divider" aria-hidden="true" />
                </ul>

                <div className="sidebar-profile">
                        {auth?.username ? (
                            <>
                                <Link className="profile-link" to={isAdmin ? "/admin/dashboard" : "/profile"} style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', flex: 1, minWidth: 0 }}>
                                    <div className="profile-avatar">{(username || 'U').slice(0,1).toUpperCase()}</div>
                                    <div className="profile-info">
                                        <div className="profile-name">{username || 'Guest'}</div>
                                        <div className="profile-role">{roleText || 'User'}</div>
                                    </div>
                                </Link>
                                <button
                                    type="button"
                                    className="sidebar-logout-btn"
                                    onClick={logout}
                                    aria-label="Log out"
                                    title="Log out"
                                >
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                                        <polyline points="16 17 21 12 16 7" />
                                        <line x1="21" y1="12" x2="9" y2="12" />
                                    </svg>
                                </button>
                            </>
                        ) : (
                            <Link className="sidebar-login" to="/login">
                                Log in
                            </Link>
                        )}
                </div>

            </aside>
        </>
    );
};