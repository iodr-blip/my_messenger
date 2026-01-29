
import React, { useState, useEffect } from 'react';
import { User, Chat, Message, AppTab } from './types';
import Sidebar from './components/Sidebar';
import ChatWindow from './components/ChatWindow';
import Auth from './components/Auth';
import ProfileModal from './components/ProfileModal';

const DEFAULT_CHATS: Chat[] = [
  {
    id: 'saved',
    type: 'saved',
    participants: [],
    unreadCount: 0,
    lastMessage: {
      id: 's1',
      senderId: 'me',
      text: 'Облачное хранилище ваших идей',
      timestamp: Date.now(),
      status: 'read'
    }
  }
];

const DEFAULT_MESSAGES: Record<string, Message[]> = {
  'saved': [DEFAULT_CHATS[0].lastMessage!]
};

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [profileModal, setProfileModal] = useState<{ isOpen: boolean, mode: 'view' | 'settings', user: User | null }>({ isOpen: false, mode: 'view', user: null });
  const [showArchived, setShowArchived] = useState(false);
  const [chats, setChats] = useState<Chat[]>(() => {
    const saved = localStorage.getItem('mopsgram_chats');
    return saved ? JSON.parse(saved) : DEFAULT_CHATS;
  });
  const [allMessages, setAllMessages] = useState<Record<string, Message[]>>(() => {
    const saved = localStorage.getItem('mopsgram_messages');
    return saved ? JSON.parse(saved) : DEFAULT_MESSAGES;
  });
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.ALL);

  useEffect(() => {
    const savedUser = localStorage.getItem('mopsgram_user');
    if (savedUser) setCurrentUser(JSON.parse(savedUser));
    setIsReady(true);
  }, []);

  useEffect(() => { if (isReady) localStorage.setItem('mopsgram_messages', JSON.stringify(allMessages)); }, [allMessages, isReady]);
  useEffect(() => { if (isReady) localStorage.setItem('mopsgram_chats', JSON.stringify(chats)); }, [chats, isReady]);
  useEffect(() => { if (currentUser) localStorage.setItem('mopsgram_user', JSON.stringify(currentUser)); }, [currentUser]);

  const handleAuthComplete = (user: User) => {
    setCurrentUser(user);
  };

  const handleLogout = () => {
    if (window.confirm('Выйти из аккаунта?')) {
      localStorage.clear();
      setCurrentUser(null);
      setActiveChatId(null);
      setChats(DEFAULT_CHATS);
      setAllMessages(DEFAULT_MESSAGES);
    }
  };

  const handleSendMessage = async (chatId: string, text: string, file?: File, isAudio?: boolean) => {
    if (!currentUser) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      senderId: currentUser.id,
      text,
      timestamp: Date.now(),
      status: 'sent',
      fileName: file?.name,
      fileSize: file ? (file.size / 1024).toFixed(1) + ' KB' : undefined,
      fileUrl: file && !isAudio ? URL.createObjectURL(file) : undefined,
      audioUrl: file && isAudio ? URL.createObjectURL(file) : undefined
    };

    setAllMessages(prev => ({ ...prev, [chatId]: [...(prev[chatId] || []), newMessage] }));
    setChats(prev => prev.map(c => c.id === chatId ? { ...c, lastMessage: newMessage } : c));
  };

  const handleChatAction = (action: string, chatId: string) => {
    if (action === 'delete') {
      if (window.confirm('Удалить этот чат?')) {
        setChats(prev => prev.filter(c => c.id !== chatId));
        if (activeChatId === chatId) setActiveChatId(null);
      }
    } else if (action === 'pin') {
      setChats(prev => prev.map(c => c.id === chatId ? { ...c, pinned: !c.pinned } : c));
    } else if (action === 'archive') {
      setChats(prev => prev.map(c => c.id === chatId ? { ...c, archived: !c.archived } : c));
    } else if (action === 'clear') {
      setAllMessages(prev => ({ ...prev, [chatId]: [] }));
    }
  };

  const openProfile = (user: User, mode: 'view' | 'settings' = 'view') => {
    setProfileModal({ isOpen: true, mode, user });
  };

  if (!isReady) return null;
  if (!currentUser) return <Auth onComplete={handleAuthComplete} />;

  const activeChat = chats.find(c => c.id === activeChatId);

  // Get all messages related to the user being viewed to count media
  const getUserMediaMessages = (userId: string) => {
    let userMessages: Message[] = [];
    Object.values(allMessages).forEach(chatMsgs => {
      userMessages = userMessages.concat(chatMsgs.filter(m => m.senderId === userId));
    });
    return userMessages;
  };

  return (
    <div className="flex h-screen w-full bg-[#0e1621] overflow-hidden text-white font-sans selection:bg-[#2481cc]/30">
      <div className={`w-full md:w-[320px] lg:w-[400px] flex-shrink-0 flex flex-col ${activeChatId ? 'hidden md:flex' : 'flex'}`}>
        <Sidebar 
          chats={chats} 
          activeChatId={activeChatId} 
          onChatSelect={setActiveChatId} 
          activeTab={activeTab} 
          onTabSelect={setActiveTab} 
          currentUser={currentUser} 
          onLogout={handleLogout}
          onChatAction={handleChatAction}
          onProfileOpen={(mode) => openProfile(currentUser, mode)}
          showArchived={showArchived}
          onToggleArchived={setShowArchived}
        />
      </div>
      <div className={`flex-1 ${!activeChatId ? 'hidden md:flex' : 'flex'}`}>
        {activeChat ? (
          <div className="flex-1 flex flex-col relative">
            <ChatWindow 
              chat={activeChat} 
              messages={allMessages[activeChat.id] || []} 
              onSendMessage={(text, file, isAudio) => handleSendMessage(activeChat.id, text, file, isAudio)} 
              onBack={() => setActiveChatId(null)} 
              currentUser={currentUser}
              onProfileOpen={(user) => openProfile(user, 'view')}
              onMessageAction={(action, msg) => {
                if (action === 'delete') {
                  setAllMessages(prev => ({ ...prev, [activeChat.id]: prev[activeChat.id].filter(m => m.id !== msg.id) }));
                }
              }}
            />
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center chat-bg">
            <div className="w-32 h-32 bg-white/5 rounded-full flex items-center justify-center mb-6 animate-fade-in border border-white/5">
              <i className="fa-solid fa-dog text-5xl opacity-20"></i>
            </div>
            <p className="text-sm text-white/30 font-medium tracking-wide uppercase">Выберите чат</p>
          </div>
        )}
      </div>

      {profileModal.isOpen && profileModal.user && (
        <ProfileModal 
          user={profileModal.user} 
          isMe={profileModal.user.id === currentUser.id}
          isSettings={profileModal.mode === 'settings'}
          userMessages={getUserMediaMessages(profileModal.user.id)}
          onUpdate={setCurrentUser} 
          onClose={() => setProfileModal({ ...profileModal, isOpen: false })} 
        />
      )}
    </div>
  );
};

export default App;
