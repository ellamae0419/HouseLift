import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar/index";
import { MobileTabBar } from "./MobileTabBar/index";
import { AppTopBar } from "./AppTopBar/index";
import { ConnectivityBanner } from "./ConnectivityBanner/index";
import useAuth from "../hooks/auth/useAuth";
import { hasAnyRole, isActivated } from "../utils/roles";

const Layout = () => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const location = useLocation();
    const { auth } = useAuth();
    const isAdmin = hasAnyRole(auth, ["admin"]);

    useEffect(() => {
        setSidebarOpen(false);
    }, [location.pathname]);

    // A customer who has not entered their serial code yet has nothing to see.
    if (auth?.accessToken && !isAdmin && !isActivated(auth)) {
        return <Navigate to="/activate" replace />;
    }

    if (!isAdmin) {
        return (
            <div className="layout-shell has-mobile-tab-bar app-shell">
                <AppTopBar />
                <ConnectivityBanner />
                <main className="app-main">
                    <Outlet />
                </main>
                <MobileTabBar />
            </div>
        );
    }

    return (
        <div className="layout-shell has-sidebar">
            <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
            <button
                type="button"
                className="mobile-menu-btn"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open navigation menu"
                aria-expanded={sidebarOpen}
            >
                ☰
            </button>
            {sidebarOpen && <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} aria-hidden="true" />}
            <main className="app-main">
                <ConnectivityBanner />
                <Outlet />
            </main>
        </div>
    );
}

export default Layout;
