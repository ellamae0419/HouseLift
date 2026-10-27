// Entry point of the HydroLift shop: a separate website from the dashboard site, with its
// own look (shop.css) and no dark mode. It has the selling pages (each menu item opens
// its own page) and the order form.
// Logging in happens on the dashboard site, which the "Log in" links point to (see
// utils/siteLinks.js).
import { lazy, Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './shop.css';
import ErrorBoundary from '../src/components/ErrorBoundary/index';
import { Landing, About, Product, HowItWorks, Specifications, Faq, Contact } from '../src/pages/Landing/index';

// The order form carries the whole Philippine address list, which is most of the
// download. Loading it only when someone opens /buy keeps the selling page quick.
const Shop = lazy(() => import('../src/pages/Shop/index').then((m) => ({ default: m.Shop })));

ReactDOM.createRoot(document.getElementById('root')).render(
    <ErrorBoundary>
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/about" element={<About />} />
                <Route path="/product" element={<Product />} />
                <Route path="/how-it-works" element={<HowItWorks />} />
                <Route path="/specifications" element={<Specifications />} />
                <Route path="/faq" element={<Faq />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/buy" element={<Suspense fallback={<p style={{ padding: 24 }}>Loading the order form…</p>}><Shop /></Suspense>} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    </ErrorBoundary>
);
