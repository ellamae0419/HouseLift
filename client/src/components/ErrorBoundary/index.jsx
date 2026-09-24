import { Component } from 'react';

class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error, info) {
        console.error('[ErrorBoundary] Unhandled error:', error, info);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center',
                    justifyContent: 'center', gap: '16px', padding: '24px', textAlign: 'center',
                    background: 'var(--hl-page-bg, #EFF6F5)',
                }}>
                    <h1 style={{ fontFamily: 'var(--font-heading, inherit)', color: 'var(--hl-ink, #16232A)', margin: 0 }}>
                        Something went wrong
                    </h1>
                    <p style={{ color: 'var(--hl-ink-secondary, #5B6B70)', maxWidth: '420px', margin: 0 }}>
                        An unexpected error occurred. Try reloading the page — if it keeps happening,
                        please let an administrator know.
                    </p>
                    <button
                        type="button"
                        onClick={() => window.location.reload()}
                        style={{
                            padding: '10px 22px', borderRadius: '9px', border: 'none',
                            background: 'var(--hl-accent, #2C9C93)', color: '#fff', fontWeight: 600,
                            fontSize: '14px', cursor: 'pointer',
                        }}
                    >
                        Reload page
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
