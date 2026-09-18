import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import useAxiosPrivate from '../hooks/auth/useAxiosPrivate';
import useAuth from '../hooks/auth/useAuth';

const NotificationsContext = createContext({});

const ITEMS_PER_PAGE = 10;

export const NotificationsProvider = ({ children }) => {
    const axiosPrivate = useAxiosPrivate();
    const { auth } = useAuth();

    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [page, setPage] = useState(1);
    const [pageCount, setPageCount] = useState(0);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const fetchNotifications = useCallback(async (targetPage = 1) => {
        setLoading(true);
        setError('');

        try {
            const response = await axiosPrivate.get('/notifications', {
                params: {
                    page: targetPage,
                    limit: ITEMS_PER_PAGE,
                },
            });

            const payload = response?.data || {};
            const pagination = payload.pagination || {};

            setNotifications(Array.isArray(payload.data) ? payload.data : []);
            setUnreadCount(payload.unreadCount || 0);
            setPage(pagination.page || targetPage);
            setPageCount(pagination.pageCount || 0);
            setTotal(pagination.total || 0);
        } catch (err) {
            setError(err?.response?.data?.message || 'Failed to load notifications.');
        } finally {
            setLoading(false);
        }
    }, [axiosPrivate]);

    const fetchUnreadCount = useCallback(async () => {
        try {
            const response = await axiosPrivate.get('/notifications', {
                params: { page: 1, limit: 1 },
            });
            setUnreadCount(response?.data?.unreadCount || 0);
        } catch (_err) {
        }
    }, [axiosPrivate]);

    const markAllAsRead = useCallback(async () => {
        try {
            await axiosPrivate.patch('/notifications/read-all');
            setUnreadCount(0);
            setNotifications((prev) => prev.map((item) => ({ ...item, isRead: 1 })));
        } catch (err) {
            setError(err?.response?.data?.message || 'Failed to mark notifications as read.');
        }
    }, [axiosPrivate]);

    const newNotification = useCallback(async (title, description) => {
        const safeTitle = title?.trim();
        const safeDescription = description?.trim();

        if (!safeTitle || !safeDescription) {
            throw new Error('Title and description are required.');
        }

        const response = await axiosPrivate.post('/notifications', {
            title: safeTitle,
            description: safeDescription,
        });

        setUnreadCount((prev) => prev + 1);

        if (page === 1) {
            fetchNotifications(1);
        }

        return response?.data?.notification || null;
    }, [axiosPrivate, fetchNotifications, page]);

    useEffect(() => {
        if (!auth?.accessToken) {
            setNotifications([]);
            setUnreadCount(0);
            setPage(1);
            setPageCount(0);
            setTotal(0);
            setLoading(false);
            setError('');
            return;
        }

        fetchUnreadCount();
    }, [auth?.accessToken, fetchUnreadCount]);

    const value = useMemo(() => ({
        notifications,
        unreadCount,
        page,
        pageCount,
        total,
        itemsPerPage: ITEMS_PER_PAGE,
        loading,
        error,
        fetchNotifications,
        fetchUnreadCount,
        markAllAsRead,
        newNotification,
    }), [
        notifications,
        unreadCount,
        page,
        pageCount,
        total,
        loading,
        error,
        fetchNotifications,
        fetchUnreadCount,
        markAllAsRead,
        newNotification,
    ]);

    return (
        <NotificationsContext.Provider value={value}>
            {children}
        </NotificationsContext.Provider>
    );
};

export default NotificationsContext;
