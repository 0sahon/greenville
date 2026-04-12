import React from 'react';
import { SCHOOL_LOGO_PATH, SCHOOL_NAME, SCHOOL_TAGLINE, SCHOOL_WEBSITE } from '../../config/schoolBrand';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}

export default function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-blue-50 to-green-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* School Header */}
        <div className="text-center mb-8">
          <div className="inline-block mb-4">
            <img
              src={SCHOOL_LOGO_PATH}
              alt={SCHOOL_NAME}
              className="w-24 h-24 rounded-full object-contain shadow-lg mx-auto ring-4 ring-orange-200 bg-white"
            />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">{SCHOOL_NAME}</h1>
          <p className="text-gray-600 text-sm italic">{SCHOOL_TAGLINE}</p>
        </div>

        {/* Auth Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">{title}</h2>
            <p className="text-gray-600 text-sm">{subtitle}</p>
          </div>
          {children}
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-xs text-gray-500">
            Benin City, Nigeria ·{' '}
            <a href={SCHOOL_WEBSITE} target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-700">
              Official site
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}