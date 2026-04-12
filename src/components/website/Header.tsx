import { useState, useEffect } from 'react';
import { Menu, X, Phone, Mail, MapPin, Sparkles } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import {
  SCHOOL_ADDRESS_SINGLE,
  SCHOOL_EMAIL_INFO,
  SCHOOL_LOGO_PATH,
  SCHOOL_NAME,
  SCHOOL_PHONE_DISPLAY,
  SCHOOL_TAGLINE,
} from '../../config/schoolBrand';

interface HeaderProps {
  onLoginClick: () => void;
  onKidsZoneClick: () => void;
}

const navigation = [
  { name: 'Home', href: '/' },
  { name: 'About Us', href: '/about' },
  { name: 'Programs', href: '/programs' },
  { name: 'Admissions', href: '/admissions' },
  { name: 'Academics', href: '/academics' },
  { name: 'News & Events', href: '/news-events' },
  { name: 'Gallery', href: '/gallery' },
  { name: 'Contact', href: '/contact' },
];

export default function Header({ onLoginClick, onKidsZoneClick }: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    document.body.style.overflow = isMenuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isMenuOpen]);

  return (
    <>
    {/* Backdrop — blocks scroll and click-through when mobile menu is open */}
    {isMenuOpen && (
      <div
        className="fixed inset-0 z-40 bg-black/40 xl:hidden"
        onClick={() => setIsMenuOpen(false)}
        aria-hidden="true"
      />
    )}
    <div className="sticky top-0 z-50">

      {/* Top Bar — hidden on mobile */}
      <div className="hidden sm:block bg-green-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center py-1.5 text-xs">
          <div className="flex items-center gap-5">
            <span className="flex items-center gap-1.5">
              <Phone className="w-3 h-3 flex-shrink-0" />
              {SCHOOL_PHONE_DISPLAY}
            </span>
            <span className="flex items-center gap-1.5">
              <Mail className="w-3 h-3 flex-shrink-0" />
              {SCHOOL_EMAIL_INFO}
            </span>
          </div>
          <span className="flex items-center gap-1.5">
            <MapPin className="w-3 h-3 flex-shrink-0" />
            {SCHOOL_ADDRESS_SINGLE}
          </span>
        </div>
      </div>

      {/* Main Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20 xl:h-16">

            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5 flex-shrink-0 group">
              <img
                src={SCHOOL_LOGO_PATH}
                alt={SCHOOL_NAME}
                className="w-14 h-14 xl:w-11 xl:h-11 rounded-full object-contain bg-white"
              />
              <div className="leading-tight">
                <div className="text-[17px] xl:text-[15px] font-bold text-gray-900 tracking-tight">
                  {SCHOOL_NAME}
                </div>
                <div className="text-[11px] xl:text-[10px] text-gray-500 tracking-wide italic">
                  {SCHOOL_TAGLINE}
                </div>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden xl:flex items-center gap-0.5">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150 whitespace-nowrap ${
                    location.pathname === item.href
                      ? 'text-orange-600 bg-orange-50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  {item.name}
                </Link>
              ))}
            </nav>

            {/* Desktop Actions */}
            <div className="hidden xl:flex items-center gap-2 flex-shrink-0">
              <button
                onClick={onKidsZoneClick}
                className="flex items-center gap-1.5 text-sm font-semibold text-purple-600 bg-purple-50 hover:bg-purple-100 px-3 py-2 rounded-full transition-colors duration-150"
              >
                <Sparkles className="w-4 h-4" />
                Kids Zone
              </button>
              <button
                onClick={onLoginClick}
                className="text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 px-4 py-2 rounded-full transition-colors duration-150"
              >
                Parent Portal
              </button>
            </div>

            {/* Hamburger — shown below xl */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
              className="xl:hidden p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile / Tablet Drawer */}
        {isMenuOpen && (
          <div className="xl:hidden border-t border-gray-100 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2">

              {/* Nav links */}
              <nav className="space-y-0.5 mb-3">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setIsMenuOpen(false)}
                    className={`flex items-center px-3 py-2.5 rounded-md text-sm font-medium transition-colors duration-150 ${
                      location.pathname === item.href
                        ? 'text-orange-600 bg-orange-50'
                        : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    {item.name}
                  </Link>
                ))}
              </nav>

              {/* Action buttons */}
              <div className="border-t border-gray-100 pt-3 pb-2 flex flex-col sm:flex-row gap-2">
                <button
                  onClick={() => { onKidsZoneClick(); setIsMenuOpen(false); }}
                  className="flex items-center justify-center gap-2 text-sm font-semibold text-purple-600 bg-purple-50 hover:bg-purple-100 px-4 py-2.5 rounded-full transition-colors"
                >
                  <Sparkles className="w-4 h-4" />
                  Kids Zone
                </button>
                <button
                  onClick={() => { onLoginClick(); setIsMenuOpen(false); }}
                  className="flex items-center justify-center text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 px-4 py-2.5 rounded-full transition-colors"
                >
                  Parent Portal
                </button>
              </div>
            </div>
          </div>
        )}
      </header>
    </div>
    </>
  );
}
