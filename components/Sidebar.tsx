
import React, { useState, useEffect } from 'react';
import { Chat, User, AppTab } from '../types';
import { db } from '../services/firebase';
import { collection, query, where, getDocs, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { VerifiedIcon } from './Messenger';

interface SidebarProps {
  chats: Chat[];
  activeChatId: string | null;
  onChatSelect: (id: string) => void;
  activeTab: AppTab;
  onTabSelect: (tab: AppTab) => void;
  currentUser: User;
  onLogout: () => void;
  onProfileOpen: () => void;
  onNewChat: (targetUser: User) => void;
}

const ChatItem: React.FC<{ 
  chat: Chat, 
  isActive: boolean, 
  currentUserId: string, 
  onClick: () => void 
}> = ({ chat, isActive, currentUserId, onClick }) => {
  const [participant, setParticipant] = useState<User | null>(null);
  const isSaved = chat.type === 'saved';
  const unreadCount = chat.unreadCount || 0;

  useEffect(() => {
    if (isSaved) return;
    const otherId = chat.participantsUids?.find(id => id !== currentUserId);
    if (otherId) {
      const unsub = onSnapshot(doc(db, 'users', otherId), (doc) => {
        if (doc.exists()) setParticipant({ id: doc.id, ...doc.data() } as User);
      });
      return () => unsub();
    }
  }, [chat.id, currentUserId, isSaved]);

  return (
    <button onClick={onClick} className={`w-full flex items-center gap-3.5 p-3 md:p-3.5 transition-all relative group active:scale-[0.98] ${isActive ? 'bg-blue-600' : 'hover:bg-white/[0.03]'}`}>
      <div className="relative flex-shrink-0">
        {isSaved ? (
          <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-blue-500 flex items-center justify-center text-white shadow-lg">
            <i className="fa-solid fa-bookmark text-xl md:text-2xl" />
          </div>
        ) : (
          <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-slate-700 flex items-center justify-center text-white overflow-hidden shadow-md border border-white/5">
            {participant?.avatarUrl ? <img src={participant.avatarUrl} className="w-full h-full object-cover" /> : <i className="fa-solid fa-user text-lg md:text-xl" />}
          </div>
        )}
        {!isSaved && participant?.online && <div className="absolute bottom-0.5 right-0.5 w-3 h-3 md:w-3.5 md:h-3.5 bg-green-500 border-2 border-[#17212b] rounded-full" />}
      </div>
      <div className="flex-1 text-left truncate">
        <div className="flex justify-between items-center mb-0.5">
          <span className={`font-bold text-[15px] md:text-[16px] truncate flex items-center ${isActive ? 'text-white' : 'text-gray-100'}`}>
            <span className="truncate">{isSaved ? 'Избранное' : (participant?.username || 'Загрузка...')}</span>
            {!isSaved && participant?.verified && (
              <VerifiedIcon className="w-4 h-4 ml-1.5 flex-shrink-0" />
            )}
          </span>
          {chat.lastMessage && (
            <span className={`text-[10px] flex-shrink-0 ${isActive ? 'text-white/60' : 'text-[#7f91a4]'}`}>
              {new Date(chat.lastMessage.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between">
            <p className={`text-[12px] md:text-[13px] truncate flex-1 pr-2 ${isActive ? 'text-white/80' : 'text-[#7f91a4]'}`}>
                {chat.lastMessage?.text || (isSaved ? 'Ваше личное облако' : 'История очищена')}
            </p>
            {unreadCount > 0 && !isActive && (
                <div className="bg-blue-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[20px] text-center shadow-lg animate-fade-in border border-white/10">
                    {unreadCount}
                </div>
            )}
        </div>
      </div>
      {!isActive && <div className="absolute bottom-0 left-20 right-0 h-[0.5px] bg-white/[0.04]" />}
    </button>
  );
};

const Sidebar: React.FC<SidebarProps> = ({ 
  chats, activeChatId, onChatSelect, activeTab, onTabSelect, currentUser, onLogout, onProfileOpen, onNewChat
}) => {
  const [search, setSearch] = useState('');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [showContactsSearch, setShowContactsSearch] = useState(false);
  const [registry, setRegistry] = useState<User[]>([]);
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [canInstall, setCanInstall] = useState(false);

  useEffect(() => {
    const handleInstallable = () => setCanInstall(true);
    window.addEventListener('pwa-installable', handleInstallable);
    return () => window.removeEventListener('pwa-installable', handleInstallable);
  }, []);

  useEffect(() => {
    if (search.trim().length > 1) {
      const q = query(
        collection(db, 'users'),
        where('username_handle', '>=', search.startsWith('@') ? search.toLowerCase() : '@' + search.toLowerCase()),
        where('username_handle', '<=', (search.startsWith('@') ? search.toLowerCase() : '@' + search.toLowerCase()) + '\uf8ff')
      );
      getDocs(q).then(snap => {
        setSearchResults(snap.docs.map(d => ({ id: d.id, ...d.data() }) as User).filter(u => u.id !== currentUser.id));
      });
    } else {
      setSearchResults([]);
    }
  }, [search, currentUser.id]);

  const loadAllUsers = () => {
    getDocs(collection(db, 'users')).then(snap => {
      setRegistry(snap.docs.map(d => ({ id: d.id, ...d.data() }) as User).filter(u => u.id !== currentUser.id));
    });
  };

  const handleInstallApp = async () => {
    const prompt = (window as any).deferredPrompt;
    if (!prompt) return;
    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === 'accepted') {
      (window as any).deferredPrompt = null;
      setCanInstall(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#17212b] border-r border-[#0e1621] w-full relative overflow-hidden pt-[env(safe-area-inset-top)]">
      {isDrawerOpen && <div className="fixed inset-0 bg-black/50 z-[100] animate-fade-in" onClick={() => setIsDrawerOpen(false)} />}

      {showContactsSearch && (
        <div className="fixed inset-0 z-[102] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#17212b] w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl animate-slide-up flex flex-col max-h-[70vh] border border-white/5">
            <div className="p-4 border-b border-[#0e1621] flex items-center justify-between">
              <span className="font-bold text-white">Все контакты</span>
              <button onClick={() => setShowContactsSearch(false)} className="text-[#7f91a4] p-1 hover:text-white transition-all"><i className="fa-solid fa-xmark"></i></button>
            </div>
            <div className="p-4 overflow-y-auto no-scrollbar">
              {registry.map(u => (
                <button key={u.id} onClick={() => { onNewChat(u); setShowContactsSearch(false); }} className="w-full flex items-center gap-3 p-3 hover:bg-white/5 rounded-2xl transition-all active:scale-[0.98]">
                  <div className="relative shrink-0">
                    <img src={u.avatarUrl} className="w-10 h-10 rounded-full object-cover border border-white/10" />
                    {u.online && <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-[#17212b] rounded-full" />}
                  </div>
                  <div className="text-left truncate min-w-0 flex-1">
                    <div className="font-bold text-sm text-white flex items-center gap-1 min-w-0">
                      <span className="truncate">{u.username}</span>
                      {u.verified && <VerifiedIcon className="w-3.5 h-3.5 ml-1" />}
                    </div>
                    <div className="text-[11px] text-blue-400 font-bold truncate">{u.username_handle}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className={`fixed inset-y-0 left-0 w-72 bg-[#17212b] z-[101] transform transition-transform duration-300 ease-out flex flex-col border-r border-[#0e1621] pt-[env(safe-area-inset-top)] ${isDrawerOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-5 flex flex-col gap-4 border-b border-black/20 shrink-0">
          <img src={currentUser.avatarUrl} className="w-16 h-16 rounded-full object-cover shadow-lg border-2 border-white/5" />
          <div className="min-w-0">
            <div className="font-bold text-lg text-white flex items-center gap-1.5 min-w-0">
              <span className="truncate">{currentUser.username} {currentUser.surname || ''}</span>
              {currentUser.verified && <VerifiedIcon className="w-5 h-5 ml-1.5" />}
            </div>
            <div className="text-xs text-blue-400 font-bold mt-1 truncate">{currentUser.username_handle}</div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto py-2 no-scrollbar">
          <button onClick={() => { onProfileOpen(); setIsDrawerOpen(false); }} className="w-full flex items-center gap-6 px-5 py-3.5 hover:bg-white/5 transition-all group text-left active:bg-white/10">
            <i className="fa-solid fa-user text-xl text-[#7f91a4] group-hover:text-white transition-all w-6 text-center"></i>
            <span className="text-sm font-medium text-white">Мой профиль</span>
          </button>
          <button onClick={() => { loadAllUsers(); setShowContactsSearch(true); setIsDrawerOpen(false); }} className="w-full flex items-center gap-6 px-5 py-3.5 hover:bg-white/5 transition-all group text-left active:bg-white/10">
            <i className="fa-solid fa-address-book text-xl text-[#7f91a4] group-hover:text-white transition-all w-6 text-center"></i>
            <span className="text-sm font-medium text-white">Контакты</span>
          </button>
          <button onClick={() => { onChatSelect('saved'); setIsDrawerOpen(false); }} className="w-full flex items-center gap-6 px-5 py-3.5 hover:bg-white/5 transition-all group text-left active:bg-white/10">
            <i className="fa-solid fa-bookmark text-xl text-[#7f91a4] group-hover:text-white transition-all w-6 text-center"></i>
            <span className="text-sm font-medium text-white">Избранное</span>
          </button>
          
          {canInstall && (
            <button onClick={handleInstallApp} className="mx-4 my-4 flex items-center gap-4 px-4 py-3 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-all text-left rounded-xl active:scale-95">
              <i className="fa-solid fa-mobile-screen-button text-lg w-5 text-center"></i>
              <span className="text-[11px] font-bold uppercase tracking-wider">Установить приложение</span>
            </button>
          )}

          <button onClick={onLogout} className="w-full flex items-center gap-6 px-5 py-3.5 hover:bg-red-500/10 text-red-400 transition-all mt-4 text-left active:bg-red-500/20">
            <i className="fa-solid fa-right-from-bracket text-xl w-6 text-center"></i>
            <span className="text-sm font-medium">Выйти</span>
          </button>
        </div>
        <div className="p-5 text-[11px] text-[#7f91a4] shrink-0 pb-[max(env(safe-area-inset-bottom),20px)]">MeganNait 1.3.1</div>
      </div>

      <div className="p-2 md:p-3 flex items-center gap-2 shrink-0">
        <button onClick={() => setIsDrawerOpen(true)} className="text-[#7f91a4] p-2 hover:text-white transition-all active:scale-90">
          <i className="fa-solid fa-bars text-xl"></i>
        </button>
        <div className="flex-1 relative">
          <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-[12px] text-[#7f91a4]"></i>
          <input 
            type="text" placeholder="Поиск" value={search} onChange={e => setSearch(e.target.value)} 
            className="w-full bg-[#0e1621] rounded-full py-2 pl-10 pr-4 text-sm outline-none text-white placeholder-[#7f91a4] border border-white/5 focus:border-blue-500/30 transition-all" 
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7f91a4] hover:text-white transition-colors">
              <i className="fa-solid fa-circle-xmark text-sm"></i>
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar scroll-smooth">
        {search.trim().length > 1 && searchResults.length > 0 && (
          <div className="p-2">
            <div className="px-4 py-2 text-[10px] font-black text-blue-400 uppercase tracking-widest">Глобальный поиск</div>
            {searchResults.map(u => (
              <button key={u.id} onClick={() => { onNewChat(u); setSearch(''); }} className="w-full flex items-center gap-3.5 p-3.5 hover:bg-white/5 transition-all animate-fade-in rounded-2xl active:scale-[0.98]">
                <div className="relative flex-shrink-0">
                  <img src={u.avatarUrl} className="w-12 h-12 md:w-14 md:h-14 rounded-full object-cover border border-white/10" />
                </div>
                <div className="text-left truncate flex-1 min-w-0">
                  <div className="font-bold text-[15px] md:text-[16px] text-white flex items-center gap-1 min-w-0">
                    <span className="truncate">{u.username}</span>
                    {u.verified && <VerifiedIcon className="w-4 h-4 ml-1" />}
                  </div>
                  <div className="text-[11px] md:text-[12px] text-blue-400 font-bold truncate">{u.username_handle}</div>
                </div>
              </button>
            ))}
          </div>
        )}

        {search.trim().length <= 1 && (
          <div className="flex flex-col pb-[max(env(safe-area-inset-bottom),10px)]">
            {chats.sort((a, b) => (b.lastMessage?.timestamp || 0) - (a.lastMessage?.timestamp || 0)).map(chat => (
              <ChatItem 
                key={chat.id} chat={chat} isActive={activeChatId === chat.id} 
                currentUserId={currentUser.id} onClick={() => onChatSelect(chat.id)} 
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
