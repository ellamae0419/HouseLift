// Entry point of the HydroLift shop: a separate website from the dashboard site, with its
// own look (shop.css) and no dark mode. It has the selling pages (each menu item opens
// its own page) and the inquiry form.
// Logging in happens on the dashboard site, which the "Log in" links point to (see
// utils/siteLinks.js).
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './shop.css';
import ErrorBoundary from '../src/components/ErrorBoundary/index';
import { Landing, About, Product, HowItWorks, Specifications, Faq, Contact } from '../src/pages/Landing/index';

import { Inquire } from '../src/pages/Shop/index';
import { Remote } from '../src/pages/Remote/index';

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
                <Route path="/inquire" element={<Inquire />} />
                <Route path="/remote" element={<Remote />} />
                <Route path="/buy" element={<Navigate to="/inquire" replace />} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    </ErrorBoundary>
);
