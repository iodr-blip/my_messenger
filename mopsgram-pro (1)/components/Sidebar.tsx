
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
    if (activeTab === AppTab.GROUPS) return matchesSearch && chat.type === 'group';
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
    <div className="flex flex-col h-full bg-[#17212b] border-r border-[#0e1621] relative overflow-hidden">
      {contextMenu && (
        <ContextMenu 
          x={contextMenu.x} 
          y={contextMenu.y} 
          items={getChatMenuItems(contextMenu.chat)} 
          onClose={() => setContextMenu(null)} 
        />
      )}

      {/* Main Hamburger Menu Overlay */}
      {showMenu && (
        <>
          <div className="fixed inset-0 bg-black/60 z-[60] animate-fade-in" onClick={() => setShowMenu(false)} />
          <div className="fixed inset-y-0 left-0 w-[280px] z-[70] bg-[#17212b] animate-slide-right flex flex-col shadow-2xl overflow-hidden">
            <div className="bg-[#2481cc] p-6 bg-gradient-to-br from-[#2481cc] to-[#2b5278] cursor-pointer" onClick={() => { onProfileOpen?.('view'); setShowMenu(false); }}>
              <div className="relative mb-4 group">
                <img src={currentUser.avatarUrl} className="w-16 h-16 rounded-[25%] border-2 border-white/20 shadow-lg object-cover transition-transform group-active:scale-95" alt="me" />
              </div>
              <div className="font-bold text-lg leading-tight truncate">{currentUser.username}</div>
              <div className="text-white/70 text-sm font-medium">{currentUser.username_handle}</div>
            </div>
            
            <div className="flex-1 py-3 overflow-y-auto">
              <button onClick={() => { onToggleArchived(!showArchived); setShowMenu(false); }} className={`w-full flex items-center gap-6 px-5 py-3 transition-colors ${showArchived ? 'bg-[#2b5278]' : 'hover:bg-white/5'}`}>
                <i className="fa-solid fa-box-archive text-[#7f91a4] w-5 text-center"></i> 
                <span className="font-medium">Архив</span>
              </button>
              <button onClick={() => { onProfileOpen?.('settings'); setShowMenu(false); }} className="w-full flex items-center gap-6 px-5 py-3 hover:bg-white/5 transition-colors">
                <i className="fa-solid fa-circle-user text-[#7f91a4] w-5 text-center"></i> 
                <span className="font-medium">Мой профиль</span>
              </button>
              
              <div className="h-[1px] bg-white/5 my-2 mx-5"></div>
              
              <button className="w-full flex items-center gap-6 px-5 py-3 hover:bg-white/5 transition-colors"><i className="fa-solid fa-user-group text-[#7f91a4] w-5 text-center"></i> <span className="font-medium">Создать группу</span></button>
              <button className="w-full flex items-center gap-6 px-5 py-3 hover:bg-white/5 transition-colors"><i className="fa-solid fa-user text-[#7f91a4] w-5 text-center"></i> <span className="font-medium">Контакты</span></button>
              <button className="w-full flex items-center gap-6 px-5 py-3 hover:bg-white/5 transition-colors"><i className="fa-solid fa-phone text-[#7f91a4] w-5 text-center"></i> <span className="font-medium">Звонки</span></button>
              <button onClick={() => { onChatSelect('saved'); setShowMenu(false); }} className="w-full flex items-center gap-6 px-5 py-3 hover:bg-white/5 transition-colors"><i className="fa-solid fa-bookmark text-[#7f91a4] w-5 text-center"></i> <span className="font-medium">Избранное</span></button>
              <button onClick={() => { onProfileOpen?.('settings'); setShowMenu(false); }} className="w-full flex items-center gap-6 px-5 py-3 hover:bg-white/5 transition-colors"><i className="fa-solid fa-gear text-[#7f91a4] w-5 text-center"></i> <span className="font-medium">Настройки</span></button>
              
              <div className="h-[1px] bg-white/5 my-2 mx-5"></div>
              
              <button onClick={onLogout} className="w-full flex items-center gap-6 px-5 py-3 hover:bg-red-500/10 text-red-400 transition-colors">
                <i className="fa-solid fa-power-off w-5 text-center"></i> 
                <span className="font-medium">Выйти</span>
              </button>
            </div>
            
            <div className="p-4 text-center text-[10px] text-[#7f91a4] font-bold uppercase tracking-widest opacity-30">
              Mopsgram Pro v2.5.0
            </div>
          </div>
        </>
      )}

      {/* Sidebar Header */}
      <div className="p-2 pt-3 flex items-center gap-2">
        <button onClick={() => setShowMenu(true)} className="text-[#7f91a4] p-2 hover:text-white transition-colors active:scale-90">
          <i className="fa-solid fa-bars text-xl"></i>
        </button>
        <div className={`flex-1 relative transition-all duration-300 ${isSearchFocused ? 'ring-2 ring-[#2481cc]/20' : ''}`}>
          <i className={`fa-solid fa-search absolute left-4 top-1/2 -translate-y-1/2 text-[10px] transition-colors ${isSearchFocused ? 'text-[#2481cc]' : 'text-[#7f91a4]'}`}></i>
          <input 
            type="text" 
            placeholder={showArchived ? "Поиск в архиве" : "Поиск"} 
            value={search} 
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            onChange={e => setSearch(e.target.value)} 
            className="w-full bg-[#0e1621] rounded-full py-2 pl-10 pr-4 text-sm outline-none text-white placeholder-[#7f91a4] border border-white/5 focus:border-[#2481cc]/30" 
          />
        </div>
      </div>

      {/* Tabs / Categories (Telegram Style) */}
      {!showArchived && (
        <div className="flex border-b border-white/5 overflow-x-auto no-scrollbar scroll-smooth">
          {[
            { id: AppTab.ALL, label: 'Все' },
            { id: AppTab.PRIVATE, label: 'Личные' },
            { id: AppTab.GROUPS, label: 'Группы' },
            { id: AppTab.BOTS, label: 'Боты' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => onTabSelect(tab.id as AppTab)}
              className={`flex-1 min-w-[70px] py-3 text-[13px] font-bold transition-all relative ${activeTab === tab.id ? 'text-[#2481cc]' : 'text-[#7f91a4] hover:text-white'}`}
            >
              {tab.label}
              {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#2481cc] rounded-t-full"></div>}
            </button>
          ))}
        </div>
      )}

      {showArchived && (
        <div className="bg-[#0e1621]/80 px-4 py-3 flex items-center justify-between border-b border-white/5 animate-fade-in">
           <div className="flex items-center gap-2">
             <i className="fa-solid fa-box-archive text-[#2481cc] text-xs"></i>
             <span className="text-xs font-black text-white/50 uppercase tracking-widest">Архивные чаты</span>
           </div>
           <button onClick={() => onToggleArchived(false)} className="text-[#2481cc] text-[10px] font-black uppercase tracking-widest px-2 py-1 bg-[#2481cc]/10 rounded-md">Закрыть</button>
        </div>
      )}

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto no-scrollbar bg-[#17212b]">
        {sortedChats.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 opacity-20 text-center px-6 animate-fade-in">
            <i className={`fa-solid ${showArchived ? 'fa-box-archive' : 'fa-comment-dots'} text-5xl mb-4`}></i>
            <p className="text-sm font-medium tracking-wide">{showArchived ? 'В архиве нет чатов' : 'Чатов пока нет'}</p>
          </div>
        ) : (
          sortedChats.map(chat => {
            const isSaved = chat.type === 'saved';
            const participant = isSaved ? null : chat.participants[0];
            const isChatActive = activeChatId === chat.id;
            
            return (
              <button 
                key={chat.id} 
                onClick={() => onChatSelect(chat.id)}
                onContextMenu={(e) => handleContextMenu(e, chat)}
                className={`w-full flex items-center gap-3.5 p-3.5 transition-all duration-200 relative group overflow-hidden ${isChatActive ? 'bg-[#2481cc]' : 'hover:bg-white/5 active:bg-white/10'}`}
              >
                <div className="relative flex-shrink-0">
                  {isSaved ? (
                     <div className="w-14 h-14 rounded-[30%] bg-[#2481cc] flex items-center justify-center text-white shadow-xl border border-white/10 overflow-hidden">
                        <i className="fa-solid fa-bookmark text-2xl"></i>
                        <div className="absolute inset-0 bg-gradient-to-tr from-black/20 to-transparent"></div>
                     </div>
                  ) : (
                    <img src={participant?.avatarUrl} className="w-14 h-14 rounded-[30%] object-cover shadow-lg border border-white/5 group-hover:scale-105 transition-transform duration-300" alt="chat" />
                  )}
                  {!isSaved && participant?.online && <div className={`absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-[3px] ${isChatActive ? 'border-[#2481cc]' : 'border-[#17212b]'} rounded-full shadow-sm`}></div>}
                  {chat.pinned && (
                    <div className="absolute -top-1 -right-1 bg-amber-500 w-5 h-5 rounded-full border-2 border-[#17212b] flex items-center justify-center text-[8px] text-white">
                      <i className="fa-solid fa-thumbtack"></i>
                    </div>
                  )}
                </div>
                
                <div className="flex-1 text-left truncate">
                  <div className="flex justify-between items-center mb-0.5">
                    <span className={`font-bold text-[16px] truncate ${isChatActive ? 'text-white' : 'text-white'}`}>
                      {isSaved ? 'Избранное' : participant?.username}
                    </span>
                    <span className={`text-[11px] font-medium whitespace-nowrap ml-2 ${isChatActive ? 'text-white/70' : 'text-[#7f91a4]'}`}>
                      {chat.lastMessage ? new Date(chat.lastMessage.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : ''}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-1 overflow-hidden">
                    <p className={`text-[14px] truncate leading-tight flex-1 ${isChatActive ? 'text-white/80' : 'text-[#7f91a4]'}`}>
                      {chat.lastMessage?.senderId === currentUser.id && (
                        <span className={isChatActive ? 'text-white/60' : 'text-[#2481cc]'}>Вы: </span>
                      )}
                      {chat.lastMessage?.text || 'Нет сообщений'}
                    </p>
                    {chat.unreadCount > 0 && (
                      <div className={`flex-shrink-0 min-w-[20px] h-5 px-1.5 rounded-full flex items-center justify-center text-[10px] font-black ${isChatActive ? 'bg-white text-[#2481cc]' : 'bg-[#2481cc] text-white'}`}>
                        {chat.unreadCount}
                      </div>
                    )}
                  </div>
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
