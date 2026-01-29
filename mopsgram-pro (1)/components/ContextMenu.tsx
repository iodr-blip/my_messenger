
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
  onClose: () => void;
}

const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, items, onClose }) => {
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

  // Adjust position if menu goes off screen
  const menuWidth = 180;
  const menuHeight = items.length * 40;
  const adjustedX = x + menuWidth > window.innerWidth ? x - menuWidth : x;
  const adjustedY = y + menuHeight > window.innerHeight ? y - menuHeight : y;

  return (
    <div 
      ref={menuRef}
      className="fixed z-[999] bg-[#1c2a38]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl py-1 w-44 animate-fade-in"
      style={{ top: adjustedY, left: adjustedX }}
    >
      {items.map((item, idx) => (
        <button
          key={idx}
          onClick={(e) => {
            e.stopPropagation();
            item.onClick();
            onClose();
          }}
          className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-white/10 ${item.danger ? 'text-red-400' : 'text-white'}`}
        >
          <i className={`fa-solid ${item.icon} w-4 text-center opacity-70`}></i>
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  );
};

export default ContextMenu;
