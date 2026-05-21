import { useState, useEffect } from 'react';
import { Menu, X, Phone, MapPin, Sparkles } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import {
  SCHOOL_ADDRESS_SINGLE,
  SCHOOL_LOGO_PATH,
  SCHOOL_NAME,
  SCHOOL_PHONE_DISPLAY,
  SCHOOL_PHONE_TEL_HREF,
  SCHOOL_TAGLINE,
  SCHOOL_WHATSAPP_HREF,
} from '../../config/schoolBrand';

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}

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

      {/* Top Contact Bar — Premium, wrap-proof and responsive */}
      <div className="bg-indigo-700 text-white border-b border-indigo-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 xl:py-1.5 flex flex-col xl:flex-row justify-between items-center gap-2.5 xl:gap-4 text-[11px] sm:text-xs">
          
          {/* Phone and WhatsApp */}
          <div className="flex items-center justify-center gap-x-4 gap-y-1.5 text-center">
            <a
              href={SCHOOL_PHONE_TEL_HREF}
              className="flex items-center gap-1.5 hover:text-indigo-200 transition-colors duration-150 font-medium whitespace-nowrap"
            >
              <Phone className="w-3.5 h-3.5 sm:w-3 sm:h-3 text-indigo-300 flex-shrink-0" />
              <span>{SCHOOL_PHONE_DISPLAY}</span>
            </a>

            <span className="text-indigo-400/50 font-light select-none">|</span>

            <a
              href={SCHOOL_WHATSAPP_HREF}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 hover:text-green-300 transition-colors duration-150 font-medium whitespace-nowrap"
            >
              <WhatsAppIcon className="w-3.5 h-3.5 sm:w-3 sm:h-3 text-green-400 flex-shrink-0" />
              <span>WhatsApp</span>
            </a>
          </div>

          {/* Address Wrapper — centered on tablet/mobile, right-aligned on desktop */}
          <div className="flex items-center justify-center gap-1.5 text-center xl:text-right max-w-full px-2">
            <MapPin className="w-3.5 h-3.5 sm:w-3 sm:h-3 text-indigo-300 flex-shrink-0" />
            <span className="leading-snug text-center xl:text-right">
              {SCHOOL_ADDRESS_SINGLE}
            </span>
          </div>
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
                      ? 'text-indigo-600 bg-indigo-50'
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
                className="flex items-center gap-1.5 text-sm font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-2 rounded-full border border-indigo-100 transition-colors duration-150"
              >
                <Sparkles className="w-4 h-4 text-indigo-500" />
                Kids Zone
              </button>
              <button
                onClick={onLoginClick}
                className="text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-full transition-colors duration-150"
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
                        ? 'text-indigo-600 bg-indigo-50'
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
                  className="flex items-center justify-center gap-2 text-sm font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-4 py-2.5 rounded-full border border-indigo-100 transition-colors"
                >
                  <Sparkles className="w-4 h-4 text-indigo-500" />
                  Kids Zone
                </button>
                <button
                  onClick={() => { onLoginClick(); setIsMenuOpen(false); }}
                  className="flex items-center justify-center text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2.5 rounded-full transition-colors"
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
