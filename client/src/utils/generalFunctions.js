export const setTitle = (newTitle) => {
    return (document.title = newTitle ? `${import.meta.env.VITE_APP_NAME} - ${newTitle}` : import.meta.env.VITE_APP_NAME);
}

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