import '../../assets/main.css'
import { setTitle } from '../../utils/generalFunctions';
import { useEffect } from 'react';
import ReactPaginate from 'react-paginate';
import useNotifications from '../../hooks/useNotifications';
import './style.css';

const formatTimeAgo = (timestamp) => {
    const date = new Date(timestamp);
    const seconds = Math.max(Math.floor((Date.now() - date.getTime()) / 1000), 0);

    if (seconds < 60) return 'just now';

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;

    const days = Math.floor(hours / 24);
    if (days < 30) return `${days} day${days > 1 ? 's' : ''} ago`;

    const months = Math.floor(days / 30);
    if (months < 12) return `${months} month${months > 1 ? 's' : ''} ago`;

    const years = Math.floor(months / 12);
    return `${years} year${years > 1 ? 's' : ''} ago`;
};

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

            {error && <p className='notifications-state notifications-state--error'>{error}</p>}

            {loading && <p className='notifications-state'>Loading notifications...</p>}

            {!loading && !error && notifications.length === 0 && (
                <p className='notifications-state'>No notifications yet.</p>
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



