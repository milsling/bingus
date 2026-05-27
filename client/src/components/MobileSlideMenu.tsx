'use client';

import { useState, useEffect } from 'react';

export default function MobileSlideMenu() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
    } else {
      document.body.style.overflow = 'unset';
      document.body.style.touchAction = 'auto';
    }
    return () => {
      document.body.style.overflow = 'unset';
      document.body.style.touchAction = 'auto';
    };
  }, [isOpen]);

  return (
    <>
      {/* Bottom Nav Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-zinc-950 border-t border-zinc-800 z-40">
        <div className="flex justify-around items-center py-4">
          {/* Other icons here */}
          <button
            onClick={() => setIsOpen(true)}
            className="w-16 h-16 bg-violet-600 hover:bg-violet-500 rounded-2xl flex items-center justify-center -mt-8 shadow-2xl active:scale-95 transition-all"
          >
            <span className="text-4xl leading-none">+</span>
          </button>
        </div>
      </div>

      {/* Slide Up Menu */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 flex flex-col"
          onClick={() => setIsOpen(false)}
        >
          <div 
            className="mt-auto bg-zinc-900 rounded-t-3xl max-h-[88vh] overflow-y-auto overscroll-contain pb-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center pt-4 pb-6">
              <div className="w-12 h-1.5 bg-zinc-700 rounded-full" />
            </div>
            
            {/* YOUR MENU CONTENT - customize this to your vision */}
            <div className="px-6 space-y-6 text-lg">
              <a href="/" className="block py-4 border-b border-zinc-800">🏠 Home</a>
              <a href="/bars" className="block py-4 border-b border-zinc-800">🍺 Find Orphan Bars</a>
              <a href="/map" className="block py-4 border-b border-zinc-800">🗺️ Map</a>
              <a href="/profile" className="block py-4 border-b border-zinc-800">👤 Profile</a>
              {/* Add more links as needed */}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
