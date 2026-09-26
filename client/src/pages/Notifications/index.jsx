import '../../assets/main.css'
import { setTitle, formatTimeAgo } from '../../utils/generalFunctions';
import { useEffect } from 'react';
import ReactPaginate from 'react-paginate';
import useNotifications from '../../hooks/useNotifications';
import useAuth from '../../hooks/auth/useAuth';
import { hasAnyRole } from '../../utils/roles';
import './style.css';

export const Notifications = () => {
    const {
        notifications,
        page,
        pageCount,
        total,
        loading,
        error,
        fetchNotifications,
        markAllAsRead,
    } = useNotifications();
    const { auth } = useAuth();
    const isAdmin = hasAnyRole(auth, ['admin']);

    setTitle("Notifications");

    useEffect(() => {
        const init = async () => {
            await markAllAsRead();
            await fetchNotifications(1);
        };

        init();
    }, [fetchNotifications, markAllAsRead]);

    const handlePageClick = (event) => {
        fetchNotifications(event.selected + 1);
    };

    return (
        <>
            <h1 className='page-title'>Notifications</h1>
            <p className="page-subtitle">
                {isAdmin
                    ? 'Alerts about flood risk, maintenance and account approvals appear here.'
                    : 'Alerts about flood risk and maintenance appear here.'}
            </p>

            {error && <p className='notifications-state notifications-state--error'>{error}</p>}

            {loading && <p className='notifications-state'>Loading notifications...</p>}

            {!loading && !error && notifications.length === 0 && (
                <div className="notifications-empty">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                    </svg>
                    <div className="notifications-empty__title">No notifications yet</div>
                    <div className="notifications-empty__subtitle">
                        {isAdmin
                            ? "You'll be notified here the moment a home reports rising water, a lift completes maintenance, or a new account needs approval."
                            : "You'll be notified here the moment your pet house reports rising water or completes maintenance."}
                    </div>
                </div>
            )}

            {!loading && notifications.length > 0 && (
                <>
                    <ul className='notifications-list'>
                        {notifications.map((notification) => (
                            <li
                                key={notification.id}
                                className={`notification-card${notification.isRead ? '' : ' notification-card--unread'}`}
                            >
                                <div className='notification-card__top'>
                                    <h2 className='notification-card__title'>{notification.title}</h2>
                                    <span className='notification-card__time'>
                                        {formatTimeAgo(notification.createdAt)}
                                    </span>
                                </div>
                                <p className='notification-card__description'>{notification.description}</p>
                            </li>
                        ))}
                    </ul>

                    {pageCount > 1 && (
                        <ReactPaginate
                            breakLabel='...'
                            nextLabel='next >'
                            onPageChange={handlePageClick}
                            pageRangeDisplayed={3}
                            marginPagesDisplayed={1}
                            pageCount={pageCount}
                            previousLabel='< previous'
                            forcePage={Math.max(page - 1, 0)}
                            renderOnZeroPageCount={null}
                            containerClassName='notifications-pagination'
                            activeClassName='selected'
                            disabledClassName='disabled'
                        />
                    )}

                    <p className='notifications-state'>Total notifications: {total}</p>
                </>
            )}
        </>
    );
}



