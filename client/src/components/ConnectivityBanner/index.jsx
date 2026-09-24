import useServerUnreachable from '../../hooks/useServerUnreachable';
import './index.css';

export const ConnectivityBanner = () => {
    const unreachable = useServerUnreachable();
    if (!unreachable) return null;

    return (
        <div className="connectivity-banner" role="alert">
            Can't reach the server right now. Some data may be out of date — retrying automatically.
        </div>
    );
};

export default ConnectivityBanner;
