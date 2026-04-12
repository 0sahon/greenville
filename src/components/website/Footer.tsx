import { Phone, Mail, MapPin, Facebook, Instagram, Twitter } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  SCHOOL_ADDRESS_LINE1,
  SCHOOL_ADDRESS_LINE2,
  SCHOOL_EMAIL_INFO,
  SCHOOL_LOGO_PATH,
  SCHOOL_NAME,
  SCHOOL_PHONE_DISPLAY,
  SCHOOL_TAGLINE,
  SCHOOL_WEBSITE,
} from '../../config/schoolBrand';

export default function Footer() {
  const quickLinks = [
    { name: 'About Us', to: '/about' },
    { name: 'Programs', to: '/programs' },
    { name: 'Admissions', to: '/admissions' },
    { name: 'Contact', to: '/contact' }
  ];

  const programs = [
    { name: 'Toddler Program', to: '/programs' },
    { name: 'Early Explorers Program', to: '/programs' },
    { name: 'Elementary Program', to: '/programs' },
    { name: 'After School Care', to: '/programs' }
  ];

  return (
    <footer className="bg-gray-800 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* School Info */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-white p-0.5 flex-shrink-0 shadow">
                <img
                  src={SCHOOL_LOGO_PATH}
                  alt={SCHOOL_NAME}
                  className="w-full h-full rounded-full object-contain"
                />
              </div>
              <div>
                <h3 className="text-xl font-bold">{SCHOOL_NAME}</h3>
                <p className="text-gray-400 text-sm">{SCHOOL_TAGLINE}</p>
              </div>
            </div>
            <p className="text-gray-300 mb-6 leading-relaxed">
              Nurturing young minds with excellence through authentic Montessori methods in Benin City, Edo State — aligned with Dr. Maria Montessori&apos;s approach.
            </p>
            <div className="flex space-x-4">
              <a href={SCHOOL_WEBSITE} target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-green-700 rounded-full flex items-center justify-center hover:bg-green-600 transition-colors" title="Official website">
                <span className="text-xs font-bold text-white">www</span>
              </a>
              <a href="#" className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center hover:bg-blue-700 transition-colors">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 bg-pink-600 rounded-full flex items-center justify-center hover:bg-pink-700 transition-colors">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 bg-blue-400 rounded-full flex items-center justify-center hover:bg-blue-500 transition-colors">
                <Twitter className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-lg font-semibold mb-6">Quick Links</h4>
            <ul className="space-y-3">
              {quickLinks.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.to}
                    className="text-gray-300 hover:text-orange-400 transition-colors duration-200"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Programs */}
          <div>
            <h4 className="text-lg font-semibold mb-6">Our Programs</h4>
            <ul className="space-y-3">
              {programs.map((program) => (
                <li key={program.name}>
                  <Link
                    to={program.to}
                    className="text-gray-300 hover:text-orange-400 transition-colors duration-200"
                  >
                    {program.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="text-lg font-semibold mb-6">Contact Info</h4>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-orange-400 flex-shrink-0 mt-1" />
                <div>
                  <p className="text-gray-300">
                    {SCHOOL_ADDRESS_LINE1}<br />
                    {SCHOOL_ADDRESS_LINE2}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-gray-300">{SCHOOL_PHONE_DISPLAY}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-orange-400 flex-shrink-0" />
                <p className="text-gray-300">{SCHOOL_EMAIL_INFO}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-700 mt-12 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm mb-4 md:mb-0">
              © {new Date().getFullYear()} {SCHOOL_NAME}. All rights reserved.
            </p>
            <div className="flex space-x-6 text-sm">
              <a href="#" className="text-gray-400 hover:text-orange-400 transition-colors">
                Privacy Policy
              </a>
              <a href="#" className="text-gray-400 hover:text-orange-400 transition-colors">
                Terms of Service
              </a>
              <a href="#" className="text-gray-400 hover:text-orange-400 transition-colors">
                Accessibility
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}