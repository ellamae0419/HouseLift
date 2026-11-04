// Entry point of the HydroLift shop: a separate website from the dashboard site, with its
// own look (shop.css) and no dark mode. It has the selling pages (each menu item opens
// its own page) and the inquiry form.
// Logging in happens on the dashboard site, which the "Log in" links point to (see
// utils/siteLinks.js).
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import './shop.css';
import ErrorBoundary from '../src/components/ErrorBoundary/index';
import { Landing, About, Product, Specifications, Faq } from '../src/pages/Landing/index';

import { Contact, Schedule } from '../src/pages/Shop/index';
import { Remote } from '../src/pages/Remote/index';

// The old inquiry address (kept for saved links and the product page's size choice) now opens Contact us.
const OldInquiryLink = () => {
    const { search } = useLocation();
    return <Navigate to={`/contact${search}`} replace />;
};

ReactDOM.createRoot(document.getElementById('root')).render(
    <ErrorBoundary>
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/about" element={<About />} />
                <Route path="/product" element={<Product />} />
                <Route path="/specifications" element={<Specifications />} />
                <Route path="/faq" element={<Faq />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/schedule" element={<Schedule />} />
                <Route path="/remote" element={<Remote />} />
                <Route path="/inquire" element={<OldInquiryLink />} />
                <Route path="/buy" element={<Navigate to="/contact" replace />} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    </ErrorBoundary>
);
