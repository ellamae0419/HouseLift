import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './contexts/AuthProvider';
import { NotificationsProvider } from './contexts/NotificationsProvider';
import { disableReactDevTools } from '@fvilers/disable-react-devtools';

if(import.meta.env.MODE === 'production') {
    disableReactDevTools();
}

ReactDOM.createRoot(document.getElementById('root')).render(
    <AuthProvider>
        <NotificationsProvider>
            <App />
        </NotificationsProvider>
    </AuthProvider>
);