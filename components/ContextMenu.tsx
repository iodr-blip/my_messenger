
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
  hideReactions?: boolean;
}

const REACTIONS_LIST = ['🔥', '❤️', '❤️‍🔥', '👍', '👎'];

const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, items, onReaction, onClose, hideReactions }) => {
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

  const menuWidth = 220;
  const menuHeight = items.length * 44 + (hideReactions ? 20 : 70); 
  
  const adjustedX = x + menuWidth > window.innerWidth ? window.innerWidth - menuWidth - 10 : x;
  const adjustedY = y + menuHeight > window.innerHeight ? window.innerHeight - menuHeight - 10 : y;

  return (
    <div 
      ref={menuRef}
      className="fixed z-[999] bg-[#1c2a38]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_15px_50px_rgba(0,0,0,0.6)] py-1.5 w-[220px] animate-fade-in overflow-hidden"
      style={{ top: adjustedY, left: adjustedX }}
    >
      {/* Reactions Bar */}
      {!hideReactions && (
        <div className="flex items-center justify-between px-3 py-2.5 mb-1 border-b border-white/5">
          {REACTIONS_LIST.map((emoji) => (
            <button
              key={emoji}
              onClick={(e) => {
                e.stopPropagation();
                onReaction(emoji);
                onClose();
              }}
              className="text-2xl hover:scale-125 transition-transform duration-200 active:scale-90"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {items.map((item, idx) => (
        <button
          key={idx}
          onClick={(e) => {
            e.stopPropagation();
            item.onClick();
            onClose();
          }}
          className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 text-sm transition-all hover:bg-white/10 active:bg-white/20 ${item.danger ? 'text-red-400' : 'text-white'}`}
        >
          <div className="flex items-center gap-3">
             <i className={`fa-solid ${item.icon} w-5 text-center opacity-70`}></i>
             <span className="font-medium">{item.label}</span>
          </div>
        </button>
      ))}
    </div>
  );
};

export default ContextMenu;
