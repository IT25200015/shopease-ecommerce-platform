import React from 'react';
export default function BrandLogo({ className = "h-8" }) {
  return (
    <div className={`flex items-center gap-2 select-none ${className}`}>
      <svg viewBox="0 0 36 36" className="h-full w-auto drop-shadow-md transition-transform duration-300 hover:scale-105" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="36" height="36" rx="10" fill="url(#brandGradient)"/>
        <path d="M12 16V12C12 8.68629 14.6863 6 18 6C21.3137 6 24 8.68629 24 12V16" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
        <path d="M8 15C8 13.8954 8.89543 13 10 13H26C27.1046 13 28 13.8954 28 15V26C28 28.2091 26.2091 30 24 30H12C9.79086 30 8 28.2091 8 26V15Z" fill="white"/>
        <path d="M14 19.5C14 19.5 15.5 22 18 22C20.5 22 22 19.5 22 19.5" stroke="#ea580c" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        <defs>
          <linearGradient id="brandGradient" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
            <stop stopColor="#f97316"/><stop offset="1" stopColor="#ea580c"/>
          </linearGradient>
        </defs>
      </svg>
      <span className="text-2xl font-extrabold tracking-tight text-slate-900">
        SHOP<span className="text-orange-500">Ease</span>
      </span>
    </div>
  );
}
