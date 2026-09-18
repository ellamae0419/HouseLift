import { useContext } from 'react';
import NotificationsContext from '../contexts/NotificationsProvider';

const useNotifications = () => {
    return useContext(NotificationsContext);
};

export default useNotifications;
