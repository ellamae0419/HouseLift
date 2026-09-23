import useServerSocket from '../../hooks/useServerSocket';
import useLogout from '../../hooks/auth/useLogout';
import './index.css';

export const AppTopBar = () => {
    const { connected } = useServerSocket();
    const logout = useLogout();

    return (
        <div className="app-topbar">
            <img src="/logo.png" alt="HydroLift" className="app-topbar__logo" />
            <span className="app-topbar__name">HydroLift</span>
            <div className={`app-topbar__status ${connected ? 'is-online' : 'is-offline'}`}>
                <span className="app-topbar__dot" />
                {connected ? 'Online' : 'Offline'}
            </div>
            <button
                type="button"
                className="app-topbar__logout"
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
        </div>
    );
};

export default AppTopBar;
