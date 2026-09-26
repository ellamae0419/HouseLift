export const setTitle = (newTitle) => {
    return (document.title = newTitle ? `${import.meta.env.VITE_APP_NAME} - ${newTitle}` : import.meta.env.VITE_APP_NAME);
}

export const formatTimeAgo = (timestamp) => {
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

export const triggerNotification = async ({
    notifier,
    title,
    description,
    onSuccess,
    onError,
}) => {
    if (typeof notifier !== 'function') {
        throw new Error('Notifier function is required.');
    }

    try {
        await notifier(title, description);
        if (typeof onSuccess === 'function') onSuccess();
        return true;
    } catch (err) {
        if (typeof onError === 'function') {
            onError(err);
            return false;
        }

        throw err;
    }
};