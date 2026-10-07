/**
 * Footer.jsx – SHOPEase Global Footer
 * =====================================
 * 
 * Design Choices:
 * - Dark slate background (`bg-slate-900`) creates strong contrast with the 
 *   light page body, visually grounding the layout.
 * - Three-column grid with responsive collapse to single column on mobile.
 * - Subtle top border on the very bottom strip creates a two-tier footer structure.
 */

import { Link } from 'react-router-dom';
import BrandLogo from './BrandLogo';

const ShoppingBagIcon = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>
  </svg>
);

const footerLinks = {
  Shop: [
    { label: 'All Products', to: '/products' },
    { label: 'Electronics', to: '/products' },
    { label: 'Fashion', to: '/products' },
    { label: 'Groceries', to: '/products' },
  ],
  Account: [
    { label: 'Login', to: '/login' },
    { label: 'Register', to: '/register' },
    { label: 'My Cart', to: '/cart' },
    { label: 'Sell on SHOPEase', to: '/register' },
  ],
  Legal: [
    { label: 'Privacy Policy', to: '/' },
    { label: 'Terms of Service', to: '/' },
    { label: 'Cookie Policy', to: '/' },
    { label: 'Contact Us', to: '/' },
  ],
};

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-8">

        {/* ── TOP SECTION: Brand + Links Grid ── */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">

          {/* Brand Column */}
          <div className="md:col-span-1">
            <Link to="/" className="flex items-center mb-4 group bg-white/90 p-2 rounded-xl inline-flex">
              <BrandLogo />
            </Link>
            <p className="text-sm text-slate-500 leading-relaxed">
              Your one-stop multi-vendor shopping destination. Discover thousands of products from verified sellers across India.
            </p>
            {/* Social Icons */}
            <div className="flex items-center gap-3 mt-5">
              {['Twitter', 'Instagram', 'Facebook'].map((social) => (
                <a
                  key={social}
                  href="#"
                  aria-label={social}
                  className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-orange-500 flex items-center justify-center transition-colors duration-200"
                >
                  <span className="text-[10px] font-bold text-slate-400 hover:text-white">{social[0]}</span>
                </a>
              ))}
            </div>
          </div>

          {/* Links Columns */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
                {category}
              </h3>
              <ul className="space-y-2.5">
                {links.map(({ label, to }) => (
                  <li key={label}>
                    <Link
                      to={to}
                      className="text-sm text-slate-500 hover:text-orange-400 transition-colors duration-200"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* ── BOTTOM STRIP: Copyright ── */}
        <div className="pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-slate-600">
            © {new Date().getFullYear()} SHOPEase Platform. All rights reserved.
          </p>
          <p className="text-xs text-slate-700 italic">
            Built with React + Spring Boot · University Academic Project
          </p>
        </div>
      </div>
    </footer>
  );
}
