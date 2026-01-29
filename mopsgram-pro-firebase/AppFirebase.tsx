// AppFirebase.tsx - Замени свой App.tsx на этот файл
import React, { useState, useEffect } from 'react';
import { User, Chat, Message } from './types';
import Sidebar from './components/Sidebar';
import ChatWindow from './components/ChatWindow';
import AuthFirebase from './components/AuthFirebase';
import ProfileModal from './components/ProfileModal';
import {
  onAuthChange,
  getCurrentUser,
  getUserData,
  logoutUser,
  listenToAllUsers,
  listenToRecentChats,
  listenToMessages,
  sendMessage as firebaseSendMessage,
  deleteMessage as firebaseDeleteMessage,
  createChatId,
  uploadChatImage,
  setTyping
} from './services/firebaseService';

const AppFirebase: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [profileModal, setProfileModal] = useState<{ isOpen: boolean, mode: 'view' | 'settings', user: User | null }>({ 
    isOpen: false, 
    mode: 'view', 
    user: null 
  });
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [recentChats, setRecentChats] = useState<any[]>([]);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});

  // Auth listener
  useEffect(() => {
    const unsubscribe = onAuthChange(async (firebaseUser) => {
      if (firebaseUser) {
        const userData = await getUserData(firebaseUser.uid);
        if (userData) {
          setCurrentUser(userData);
        }
      } else {
        setCurrentUser(null);
      }
      setIsReady(true);
    });

    return () => unsubscribe();
  }, []);

  // Listen to all users
  useEffect(() => {
    if (!currentUser) return;

    const unsubscribe = listenToAllUsers((users) => {
      setAllUsers(users.filter(u => u.id !== currentUser.id));
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Listen to recent chats
  useEffect(() => {
    if (!currentUser) return;

    const unsubscribe = listenToRecentChats(currentUser.id, (chats) => {
      setRecentChats(chats);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Listen to messages for active chat
  useEffect(() => {
    if (!activeChatId) return;

    const unsubscribe = listenToMessages(activeChatId, (msgs) => {
      setMessages(prev => ({ ...prev, [activeChatId]: msgs }));
    });

    return () => unsubscribe();
  }, [activeChatId]);

  const handleAuthComplete = (user: User) => {
    setCurrentUser(user);
  };

  const handleLogout = async () => {
    if (window.confirm('Выйти из аккаунта?')) {
      await logoutUser();
      setCurrentUser(null);
      setActiveChatId(null);
      setRecentChats([]);
      setMessages({});
    }
  };

  const handleSendMessage = async (chatId: string, text: string, file?: File, isAudio?: boolean) => {
    if (!currentUser) return;

    try {
      let imageUrl: string | undefined;
      
      if (file && !isAudio) {
        imageUrl = await uploadChatImage(chatId, file);
      }

      await firebaseSendMessage(chatId, {
        senderId: currentUser.id,
        text,
        imageUrl,
        fileName: file?.name,
        fileSize: file ? `${(file.size / 1024).toFixed(1)} KB` : undefined
      });

      // Stop typing indicator
      await setTyping(chatId, currentUser.id, false);
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Ошибка отправки сообщения');
    }
  };

  const handleChatAction = async (action: string, chatId: string) => {
    if (action === 'delete') {
      if (window.confirm('Удалить этот чат?')) {
        // For now, just clear from local state
        // You can implement full deletion in Firebase
        if (activeChatId === chatId) {
          setActiveChatId(null);
        }
      }
    } else if (action === 'clear') {
      if (window.confirm('Очистить историю чата?')) {
        // Implement chat clearing if needed
        setMessages(prev => ({ ...prev, [chatId]: [] }));
      }
    }
  };

  const openProfile = (user: User, mode: 'view' | 'settings' = 'view') => {
    setProfileModal({ isOpen: true, mode, user });
  };

  const handleChatSelect = (userId: string) => {
    if (!currentUser) return;
    const chatId = createChatId(currentUser.id, userId);
    setActiveChatId(chatId);
  };

  if (!isReady) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0e1621] text-white">
        <i className="fa-solid fa-circle-notch animate-spin text-3xl text-[#2481cc]"></i>
      </div>
    );
  }

  if (!currentUser) {
    return <AuthFirebase onComplete={handleAuthComplete} />;
  }

  // Transform recent chats into Chat format
  const chats: Chat[] = recentChats.map(rc => {
    const otherUser = allUsers.find(u => u.id === rc.userId);
    if (!otherUser) return null;

    return {
      id: rc.chatId,
      type: 'private' as const,
      participants: [otherUser],
      unreadCount: 0,
      lastMessage: rc.lastMessage
    };
  }).filter(Boolean) as Chat[];

  const activeChat = chats.find(c => c.id === activeChatId);

  return (
    <div className="flex h-screen w-full bg-[#0e1621] overflow-hidden text-white font-sans selection:bg-[#2481cc]/30">
      <div className={`w-full md:w-[320px] lg:w-[400px] flex-shrink-0 flex flex-col ${activeChatId ? 'hidden md:flex' : 'flex'}`}>
        <Sidebar 
          chats={chats}
          allUsers={allUsers}
          activeChatId={activeChatId} 
          onChatSelect={handleChatSelect}
          activeTab={'all'}
          onTabSelect={() => {}}
          currentUser={currentUser} 
          onLogout={handleLogout}
          onChatAction={handleChatAction}
          onProfileOpen={(mode) => openProfile(currentUser, mode)}
          showArchived={false}
          onToggleArchived={() => {}}
        />
      </div>
      <div className={`flex-1 ${!activeChatId ? 'hidden md:flex' : 'flex'}`}>
        {activeChat ? (
          <div className="flex-1 flex flex-col relative">
            <ChatWindow 
              chat={activeChat} 
              messages={messages[activeChat.id] || []} 
              onSendMessage={(text, file, isAudio) => handleSendMessage(activeChat.id, text, file, isAudio)} 
              onBack={() => setActiveChatId(null)} 
              currentUser={currentUser}
              onProfileOpen={(user) => openProfile(user, 'view')}
              onMessageAction={async (action, msg) => {
                if (action === 'delete') {
                  await firebaseDeleteMessage(activeChat.id, msg.id);
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
          userMessages={[]} // You can implement this if needed
          onUpdate={setCurrentUser} 
          onClose={() => setProfileModal({ ...profileModal, isOpen: false })} 
        />
      )}
    </div>
  );
};

export default AppFirebase;
