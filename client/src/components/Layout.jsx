import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar/index";

const Layout = () => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const location = useLocation();

    useEffect(() => {
        setSidebarOpen(false);
    }, [location.pathname]);

    return (
        <div className="layout-shell">
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
                <Outlet />
            </main>
        </div>
    );
}

export default Layout;
