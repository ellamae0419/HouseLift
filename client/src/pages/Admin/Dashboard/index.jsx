import '../../../assets/main.css';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { setTitle } from '../../../utils/generalFunctions';
import { DataCard } from '../../../components/Datacard/index';
import useServerSocket from '../../../hooks/useServerSocket';
import useAxiosPrivate from '../../../hooks/auth/useAxiosPrivate';

const REFRESH_MS = 20000;

export const AdminDashboard = () => {
    setTitle('Admin Dashboard');
    // Admins get device-status pushes for every house, so a device coming or
    // going updates this page instantly between refreshes.
    const { deviceStatusById } = useServerSocket();
    const axiosPrivate = useAxiosPrivate();
    const [users, setUsers] = useState([]);
    const [houses, setHouses] = useState([]);
    const [loading, setLoading] = useState(true);

    const loadHouses = useCallback(async () => {
        try {
            const res = await axiosPrivate.get('/users/houses');
            setHouses(res.data || []);
        } catch (err) {
            console.error('Error loading houses:', err?.response?.data?.message || err.message);
        }
    }, [axiosPrivate]);

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const res = await axiosPrivate.get('/users');
                if (mounted) setUsers(res.data || []);
            } catch (err) {
                console.error('Error loading users:', err?.response?.data?.message || err.message);
            } finally {
                if (mounted) setLoading(false);
            }
        })();
        return () => { mounted = false; };
    }, [axiosPrivate]);

    useEffect(() => {
        loadHouses();
        const timer = setInterval(loadHouses, REFRESH_MS);
        return () => clearInterval(timer);
    }, [loadHouses]);

    const totalUsers = users.length;
    const pendingCount = users.filter((u) => !u.isVerified).length;

    // An admin owns no device, so "online" here means how many of the
    // monitored houses are currently reporting in.
    const withDevices = houses.filter((h) => h.esp32_id);
    const onlineCount = withDevices.filter((h) => {
        const pushed = deviceStatusById[h.esp32_id];
        return pushed !== undefined ? pushed : !!h.online;
    }).length;
    const anyOnline = onlineCount > 0;

    return (
        <>
            <h1 className="page-title">System overview</h1>
            <p className="page-subtitle">Live status across every connected home, updated in real time.</p>
            <div className="hl-page-stack">
                <div className="hl-kpi-grid">
                    <DataCard
                        title="Total users"
                        value={loading ? '—' : totalUsers}
                        footer="Registered accounts"
                        variant="green"
                    />

                    <Link to="/admin/users" style={{ textDecoration: 'none' }}>
                        <DataCard
                            title="Pending approvals"
                            value={loading ? '—' : pendingCount}
                            footer={pendingCount > 0 ? 'Needs your review' : 'All caught up'}
                            variant={pendingCount > 0 ? 'amber' : 'green'}
                        />
                    </Link>

                    <DataCard
                        title="Devices online"
                        footer={`${onlineCount} of ${withDevices.length} houses reporting`}
                        variant="blue"
                        main={
                            <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '28px', color: anyOnline ? 'var(--hl-accent)' : 'var(--hl-danger)' }}>
                                {onlineCount}
                            </div>
                        }
                    />

                    <Link to="/admin/reports" style={{ textDecoration: 'none' }}>
                        <DataCard
                            title="Reports"
                            main={
                                <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '20px', color: 'var(--hl-accent)' }}>
                                    View trends
                                </div>
                            }
                            footer="Water levels and lift activity"
                            variant="green"
                        />
                    </Link>
                </div>
            </div>
        </>
    );
};

export default AdminDashboard;
