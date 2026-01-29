
import React, { useState } from 'react';
import { Chat, User, AppTab } from '../types';
import ContextMenu, { MenuItem } from './ContextMenu';

interface SidebarProps {
  chats: Chat[];
  activeChatId: string | null;
  onChatSelect: (id: string) => void;
  activeTab: AppTab;
  onTabSelect: (tab: AppTab) => void;
  currentUser: User;
  onLogout: () => void;
  onChatAction?: (action: string, chatId: string) => void;
  onProfileOpen?: (mode: 'view' | 'settings') => void;
  showArchived: boolean;
  onToggleArchived: (val: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  chats, 
  activeChatId, 
  onChatSelect, 
  activeTab, 
  onTabSelect, 
  currentUser, 
  onLogout, 
  onChatAction, 
  onProfileOpen,
  showArchived,
  onToggleArchived
}) => {
  const [search, setSearch] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, chat: Chat } | null>(null);

  const filteredChats = chats.filter(chat => {
    const isSaved = chat.type === 'saved';
    const name = isSaved ? 'Избранное' : chat.participants[0]?.username || '';
    const matchesSearch = name.toLowerCase().includes(search.toLowerCase());
    const matchesArchive = showArchived ? chat.archived : !chat.archived;
    
    if (!matchesArchive) return false;
    if (activeTab === AppTab.ALL) return matchesSearch;
    if (activeTab === AppTab.BOTS) return matchesSearch && chat.type === 'bot';
    if (activeTab === AppTab.PRIVATE) return matchesSearch && (chat.type === 'private' || chat.type === 'saved');
    return matchesSearch;
  });

  const sortedChats = [...filteredChats].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return (b.lastMessage?.timestamp || 0) - (a.lastMessage?.timestamp || 0);
  });

  const handleContextMenu = (e: React.MouseEvent, chat: Chat) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, chat });
  };

  const getChatMenuItems = (chat: Chat): MenuItem[] => [
    { label: chat.pinned ? 'Открепить' : 'Закрепить', icon: 'fa-thumbtack', onClick: () => onChatAction?.('pin', chat.id) },
    { label: chat.archived ? 'Вернуть из архива' : 'В архив', icon: 'fa-box-archive', onClick: () => onChatAction?.('archive', chat.id) },
    { label: 'Очистить историю', icon: 'fa-broom', onClick: () => onChatAction?.('clear', chat.id) },
    { label: 'Удалить чат', icon: 'fa-trash-can', onClick: () => onChatAction?.('delete', chat.id), danger: true },
  ];

  return (
    <div className="flex flex-col h-full bg-[#17212b] border-r border-[#0e1621] relative">
      {contextMenu && (
        <ContextMenu 
          x={contextMenu.x} 
          y={contextMenu.y} 
          items={getChatMenuItems(contextMenu.chat)} 
          onClose={() => setContextMenu(null)} 
        />
      )}

      {showMenu && (
        <>
          <div className="fixed inset-0 bg-black/60 z-40 animate-fade-in" onClick={() => setShowMenu(false)} />
          <div className="absolute inset-y-0 left-0 w-[300px] z-50 bg-[#17212b] animate-slide-right flex flex-col shadow-2xl">
            <div className="bg-[#2481cc] p-6 bg-gradient-to-br from-[#2481cc] to-[#2b5278] cursor-pointer" onClick={() => { onProfileOpen?.('view'); setShowMenu(false); }}>
              <img src={currentUser.avatarUrl} className="w-16 h-16 rounded-full border-2 border-white/20 mb-4 shadow-lg object-cover" alt="me" />
              <div className="font-bold text-lg">{currentUser.username}</div>
              <div className="text-white/70 text-sm">{currentUser.username_handle}</div>
            </div>
            <div className="flex-1 py-4 overflow-y-auto">
              <button 
                onClick={() => { onToggleArchived(!showArchived); setShowMenu(false); }} 
                className={`w-full flex items-center gap-6 px-6 py-3 transition-colors ${showArchived ? 'bg-[#2b5278] text-white' : 'hover:bg-white/5'}`}
              >
                <i className="fa-solid fa-box-archive text-[#7f91a4] w-5 text-center"></i> 
                <span>{showArchived ? 'Основной список' : 'Архив'}</span>
              </button>
              <button onClick={() => { onProfileOpen?.('view'); setShowMenu(false); }} className="w-full flex items-center gap-6 px-6 py-3 hover:bg-white/5 transition-colors"><i className="fa-solid fa-circle-user text-[#7f91a4] w-5 text-center"></i> <span>Мой профиль</span></button>
              <div className="h-[1px] bg-white/5 my-4 mx-6"></div>
              <button className="w-full flex items-center gap-6 px-6 py-3 hover:bg-white/5 transition-colors"><i className="fa-solid fa-user-group text-[#7f91a4] w-5 text-center"></i> <span>Создать группу</span></button>
              <button className="w-full flex items-center gap-6 px-6 py-3 hover:bg-white/5 transition-colors"><i className="fa-solid fa-user text-[#7f91a4] w-5 text-center"></i> <span>Контакты</span></button>
              <button className="w-full flex items-center gap-6 px-6 py-3 hover:bg-white/5 transition-colors"><i className="fa-solid fa-phone text-[#7f91a4] w-5 text-center"></i> <span>Звонки</span></button>
              <button onClick={() => { onChatSelect('saved'); setShowMenu(false); }} className="w-full flex items-center gap-6 px-6 py-3 hover:bg-white/5 transition-colors"><i className="fa-solid fa-bookmark text-[#7f91a4] w-5 text-center"></i> <span>Избранное</span></button>
              <button onClick={() => { onProfileOpen?.('settings'); setShowMenu(false); }} className="w-full flex items-center gap-6 px-6 py-3 hover:bg-white/5 transition-colors"><i className="fa-solid fa-gear text-[#7f91a4] w-5 text-center"></i> <span>Настройки</span></button>
              <div className="h-[1px] bg-white/5 my-4 mx-6"></div>
              <button onClick={onLogout} className="w-full flex items-center gap-6 px-6 py-3 hover:bg-red-500/10 text-red-400 transition-colors"><i className="fa-solid fa-power-off w-5 text-center"></i> <span>Выйти</span></button>
            </div>
          </div>
        </>
      )}

      <div className="p-3 flex items-center gap-3">
        <button onClick={() => setShowMenu(true)} className="text-[#7f91a4] p-2 hover:text-white transition-colors"><i className="fa-solid fa-bars text-xl"></i></button>
        <div className={`flex-1 relative transition-all duration-300 ${isSearchFocused ? 'ring-2 ring-[#2481cc]/30' : ''}`}>
          <i className={`fa-solid fa-search absolute left-4 top-1/2 -translate-y-1/2 text-xs transition-colors ${isSearchFocused ? 'text-[#2481cc]' : 'text-[#7f91a4]'}`}></i>
          <input 
            type="text" 
            placeholder={showArchived ? "Поиск в архиве" : "Поиск"} 
            value={search} 
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            onChange={e => setSearch(e.target.value)} 
            className="w-full bg-[#0e1621] rounded-full py-2.5 pl-10 pr-4 text-sm outline-none text-white placeholder-[#7f91a4]" 
          />
        </div>
      </div>

      {showArchived && (
        <div className="bg-[#0e1621]/50 px-4 py-2 flex items-center justify-between border-b border-white/5">
           <span className="text-xs font-bold text-[#7f91a4] uppercase tracking-widest">Архивные чаты</span>
           <button onClick={() => onToggleArchived(false)} className="text-[#2481cc] text-[10px] font-bold uppercase">Назад</button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {sortedChats.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 opacity-20 text-center px-6">
            <i className={`fa-solid ${showArchived ? 'fa-box-archive' : 'fa-comment-slash'} text-4xl mb-3`}></i>
            <p className="text-sm">{showArchived ? 'В архиве пока пусто' : 'У вас нет активных чатов'}</p>
          </div>
        ) : (
          sortedChats.map(chat => {
            const isSaved = chat.type === 'saved';
            const participant = isSaved ? null : chat.participants[0];
            return (
              <button 
                key={chat.id} 
                onClick={() => onChatSelect(chat.id)}
                onContextMenu={(e) => handleContextMenu(e, chat)}
                className={`w-full flex items-center gap-3 p-3 transition-colors relative group ${activeChatId === chat.id ? 'bg-[#2b5278]' : 'hover:bg-white/5'}`}
              >
                <div className="relative flex-shrink-0">
                  {isSaved ? (
                     <div className="w-14 h-14 rounded-full bg-[#2481cc] flex items-center justify-center text-white shadow-sm border border-white/5">
                        <i className="fa-solid fa-bookmark text-2xl"></i>
                     </div>
                  ) : (
                    <img src={participant?.avatarUrl} className="w-14 h-14 rounded-full object-cover shadow-sm border border-white/5" alt="chat" />
                  )}
                  {!isSaved && participant?.online && <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-[#17212b] rounded-full"></div>}
                  {chat.pinned && <div className="absolute -top-1 -right-1 bg-[#2481cc] w-5 h-5 rounded-full border-2 border-[#17212b] flex items-center justify-center text-[8px]"><i className="fa-solid fa-thumbtack"></i></div>}
                </div>
                <div className="flex-1 text-left truncate">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-[15px] text-white">{isSaved ? 'Избранное' : participant?.username}</span>
                    <span className="text-[10px] text-[#7f91a4]">{chat.lastMessage ? new Date(chat.lastMessage.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : ''}</span>
                  </div>
                  <p className="text-sm text-[#7f91a4] truncate leading-tight">
                    {chat.lastMessage?.senderId === currentUser.id ? <span className="text-[#2481cc]">Вы: </span> : ''}
                    {chat.lastMessage?.text}
                  </p>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Sidebar;
