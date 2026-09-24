import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './contexts/AuthProvider';
import { NotificationsProvider } from './contexts/NotificationsProvider';
import ErrorBoundary from './components/ErrorBoundary/index';
import { disableReactDevTools } from '@fvilers/disable-react-devtools';
import { applyTheme, getStoredTheme } from './utils/theme';

if(import.meta.env.MODE === 'production') {
    disableReactDevTools();
}

applyTheme(getStoredTheme());

ReactDOM.createRoot(document.getElementById('root')).render(
    <ErrorBoundary>
        <AuthProvider>
            <NotificationsProvider>
                <App />
            </NotificationsProvider>
        </AuthProvider>
    </ErrorBoundary>
);