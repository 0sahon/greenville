import React from 'react';
import { SCHOOL_LOGO_PATH, SCHOOL_NAME, SCHOOL_TAGLINE, SCHOOL_WEBSITE } from '../../config/schoolBrand';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}

export default function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-indigo-900 to-indigo-950 flex items-center justify-center p-4 relative overflow-hidden">
      
      {/* Premium Floating Glow Orbs */}
      <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-indigo-500/15 rounded-full blur-3xl pointer-events-none animate-pulse duration-[8000ms]" />
      <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] bg-brand-gold/10 rounded-full blur-3xl pointer-events-none animate-pulse duration-[10000ms]" />
      <div className="absolute top-1/4 right-1/4 w-[300px] h-[300px] bg-indigo-400/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full relative z-10">
        {/* School Header */}
        <div className="text-center mb-6">
          <div className="inline-block mb-3 group">
            <img
              src={SCHOOL_LOGO_PATH}
              alt={SCHOOL_NAME}
              className="w-24 h-24 rounded-full object-contain shadow-2xl mx-auto ring-4 ring-indigo-500/30 bg-white transform group-hover:scale-105 transition-all duration-300"
            />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight mb-1">
            {SCHOOL_NAME}
          </h1>
          <p className="text-indigo-200/80 text-sm font-medium italic tracking-wide">
            {SCHOOL_TAGLINE}
          </p>
        </div>

        {/* Premium Auth Card */}
        <div className="backdrop-blur-md bg-white/95 border border-white/20 shadow-2xl rounded-3xl p-8 transform hover:scale-[1.01] transition-all duration-300">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-black text-indigo-950 mb-1.5">{title}</h2>
            <p className="text-gray-500 text-sm font-medium">{subtitle}</p>
          </div>
          {children}
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-xs text-indigo-200/50 font-medium tracking-wide">
            Benin City, Nigeria ·{' '}
            <a href={SCHOOL_WEBSITE} target="_blank" rel="noopener noreferrer" className="underline text-indigo-300 hover:text-white transition-colors">
              Official Website
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}