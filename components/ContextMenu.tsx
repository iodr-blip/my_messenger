
import React, { useEffect, useRef } from 'react';

export interface MenuItem {
  label: string;
  icon: string;
  onClick: () => void;
  danger?: boolean;
}

interface ContextMenuProps {
  x: number;
  y: number;
  items: MenuItem[];
  onReaction: (emoji: string) => void;
  onClose: () => void;
}

const REACTIONS_LIST = ['❤️', '🐳', '🔥', '❤️‍🔥', '🤝', '🎉', '👍'];

const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, items, onReaction, onClose }) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const menuWidth = 200;
  const menuHeight = items.length * 40 + 60; // Approximate height with reactions
  
  // Keep menu within viewport
  const adjustedX = x + menuWidth > window.innerWidth ? window.innerWidth - menuWidth - 10 : x;
  const adjustedY = y + menuHeight > window.innerHeight ? window.innerHeight - menuHeight - 10 : y;

  return (
    <div 
      ref={menuRef}
      className="fixed z-[999] bg-[#1c2a38]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_15px_50px_rgba(0,0,0,0.6)] py-1.5 w-[200px] animate-fade-in overflow-hidden"
      style={{ top: adjustedY, left: adjustedX }}
    >
      {/* Reactions Bar */}
      <div className="flex items-center justify-between px-2 py-2 mb-1 border-b border-white/5 overflow-x-auto no-scrollbar gap-1">
        {REACTIONS_LIST.map((emoji) => (
          <button
            key={emoji}
            onClick={(e) => {
              e.stopPropagation();
              onReaction(emoji);
              onClose();
            }}
            className="text-xl hover:scale-125 transition-transform duration-200 p-1 rounded-lg hover:bg-white/10"
          >
            {emoji}
          </button>
        ))}
        <button className="text-[#7f91a4] hover:text-white p-1 text-sm"><i className="fa-solid fa-chevron-down opacity-50"></i></button>
      </div>

      {items.map((item, idx) => (
        <button
          key={idx}
          onClick={(e) => {
            e.stopPropagation();
            item.onClick();
            onClose();
          }}
          className={`w-full flex items-center justify-between gap-3 px-4 py-2 text-sm transition-all hover:bg-white/10 active:bg-white/20 ${item.danger ? 'text-red-400' : 'text-white'}`}
        >
          <div className="flex items-center gap-3">
             <i className={`fa-solid ${item.icon} w-5 text-center opacity-70`}></i>
             <span className="font-medium">{item.label}</span>
          </div>
          {item.icon === 'fa-circle-check' && <i className="fa-regular fa-circle text-[10px] opacity-30"></i>}
        </button>
      ))}
    </div>
  );
};

export default ContextMenu;
