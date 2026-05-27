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

  const closeMenu = () => setIsOpen(false);

  return (
    <>
      {/* Bottom Nav with Plus */}
      <div className="fixed bottom-0 left-0 right-0 bg-black border-t border-gray-800 z-40">
        <div className="flex justify-around items-center py-3">
          {/* other bottom nav stuff - add your existing icons here */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="w-14 h-14 bg-purple-600 rounded-full flex items-center justify-center -mt-8 shadow-2xl active:scale-95 transition-all"
          >
            <span className="text-4xl">+</span>
          </button>
        </div>
      </div>

      {/* Slide-Up Menu */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/90"
          onClick={closeMenu}
        >
          <div 
            className="absolute bottom-0 left-0 right-0 bg-zinc-900 rounded-t-3xl max-h-[85vh] overflow-y-auto overscroll-contain pb-safe"
            onClick={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
          >
            {/* Grabber */}
            <div className="flex justify-center pt-4 pb-2 sticky top-0 bg-zinc-900 z-10">
              <div className="w-12 h-1 bg-gray-600 rounded-full" />
            </div>

            {/* Your actual menu content - customize as needed */}
            <div className="px-6 pb-10 space-y-6">
              <a href="/" className="block py-4 text-xl border-b border-gray-800">🏠 Home</a>
              <a href="/bars" className="block py-4 text-xl border-b border-gray-800">🍻 Find Bars</a>
              {/* Add more links from your vision */}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
