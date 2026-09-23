const STORAGE_KEY = 'theme';

export const getStoredTheme = () => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored === 'light' || stored === 'dark' ? stored : 'light';
    } catch (error) {
        return 'light';
    }
};

export const applyTheme = (theme) => {
    document.documentElement.setAttribute('data-theme', theme);
};

export const setTheme = (theme) => {
    applyTheme(theme);
    try {
        localStorage.setItem(STORAGE_KEY, theme);
    } catch (error) {
        // localStorage unavailable, theme just won't persist
    }
};
