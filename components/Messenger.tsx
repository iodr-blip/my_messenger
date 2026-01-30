
import React, { useState, useEffect, useRef } from 'react';
import { User, Message, Chat, AppTab } from '../types';
import Sidebar from './Sidebar';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';
import ProfileModal from './ProfileModal';
import ContextMenu, { MenuItem } from './ContextMenu';
import { db } from '../services/firebase';
import { 
  collection, 
  query, 
  onSnapshot, 
  doc, 
  addDoc, 
  setDoc, 
  updateDoc, 
  orderBy, 
  where,
  deleteDoc,
  serverTimestamp,
  getDoc,
  writeBatch
} from 'firebase/firestore';

// Refined 14px Telegram-style verified icon
export const VerifiedIcon = ({ className = "" }: { className?: string }) => (
  <svg 
    viewBox="0 0 36 36" 
    className={`w-[14px] h-[14px] flex-shrink-0 inline-block align-middle translate-y-[-1px] ${className}`} 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
  >
    <path fill="#0080FF" d="M15.13 1.848c1.46-2.514 5.057-2.45 6.429.115l1.253 2.343a3.677 3.677 0 0 0 3.762 1.926l2.597-.373c2.842-.408 5.036 2.493 3.92 5.182L32.07 13.5a3.804 3.804 0 0 0 .865 4.192l1.906 1.833c2.086 2.006 1.224 5.56-1.54 6.348l-2.525.721c-1.484.424-2.554 1.74-2.683 3.302l-.22 2.658c-.242 2.91-3.51 4.44-5.84 2.734l-2.13-1.558a3.644 3.644 0 0 0-4.21-.075l-2.181 1.482c-2.387 1.622-5.601-.023-5.743-2.94l-.129-2.664c-.076-1.566-1.1-2.919-2.568-3.395l-2.499-.81c-2.735-.887-3.474-4.469-1.32-6.4l1.967-1.763a3.801 3.801 0 0 0 1.008-4.16l-.935-2.492C2.27 7.785 4.563 4.963 7.39 5.472l2.582.465a3.673 3.673 0 0 0 3.826-1.791l1.333-2.298Z"></path>
    <path d="M12 18L16.5 22.5L24.5 14.5" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"></path>
  </svg>
);

const formatLastSeen = (online: boolean, lastSeen: number) => {
  if (online) return 'в сети';
  if (!lastSeen) return 'был(а) недавно';
  const now = Date.now();
  const diff = now - lastSeen;
  if (diff < 60000) return 'был(а) только что';
  if (diff < 3600000) return `был(а) ${Math.floor(diff / 60000)} мин. назад`;
  const date = new Date(lastSeen);
  return `был(а) в ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
};

const formatDateSeparator = (ts: number) => {
  const date = new Date(ts);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) return 'Сегодня';
  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return 'Вчера';
  
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
};

interface MessengerProps {
  user: User;
  onLogout: () => void;
}

const Messenger: React.FC<MessengerProps> = ({ user, onLogout }) => {
  const [currentUser, setCurrentUser] = useState<User>(user);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.ALL);
  const [chats, setChats] = useState<Chat[]>([]);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; msg: Message } | null>(null);
  const [replyMessage, setReplyMessage] = useState<Message | null>(null);
  const [participant, setParticipant] = useState<User | null>(null);
  const [selectedMsgIds, setSelectedMsgIds] = useState<string[]>([]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const activeChat = chats.find(c => c.id === activeChatId);

  useEffect(() => {
    const q = query(collection(db, 'chats'), where('participantsUids', 'array-contains', currentUser.id));
    return onSnapshot(q, (snapshot) => {
      setChats(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[]);
    });
  }, [currentUser.id]);

  useEffect(() => {
    if (!activeChatId) return;
    const q = query(collection(db, `chats/${activeChatId}/messages`), orderBy('timestamp', 'asc'));
    return onSnapshot(q, (snapshot) => {
      const chatMsgs = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        if (data.senderId !== currentUser.id && data.status !== 'read') {
          updateDoc(doc(db, `chats/${activeChatId}/messages`, docSnap.id), { status: 'read' });
        }
        return { id: docSnap.id, ...data, timestamp: data.timestamp?.toMillis() || Date.now() };
      }) as Message[];
      setMessages(prev => ({ ...prev, [activeChatId]: chatMsgs }));
    });
  }, [activeChatId, currentUser.id]);

  useEffect(() => {
    if (activeChat && activeChat.type !== 'saved') {
      const otherId = activeChat.participantsUids?.find((id: string) => id !== currentUser.id);
      if (otherId) {
        return onSnapshot(doc(db, 'users', otherId), (doc) => {
          if (doc.exists()) setParticipant({ id: doc.id, ...doc.data() } as User);
        });
      }
    } else {
      setParticipant(null);
    }
  }, [activeChat, currentUser.id]);

  const openSavedMessages = async () => {
    const savedChatId = `saved_${currentUser.id}`;
    const chatDoc = await getDoc(doc(db, 'chats', savedChatId));
    if (!chatDoc.exists()) {
      await setDoc(doc(db, 'chats', savedChatId), {
        type: 'saved',
        participantsUids: [currentUser.id],
        unreadCount: 0,
        createdAt: serverTimestamp()
      });
    }
    setActiveChatId(savedChatId);
  };

  const handleUpdateProfile = async (updatedUser: User) => {
    setCurrentUser(updatedUser);
    if (profileUser && profileUser.id === updatedUser.id) {
      setProfileUser(updatedUser);
    }
    try {
      const userRef = doc(db, 'users', updatedUser.id);
      const { id, ...data } = updatedUser;
      await updateDoc(userRef, data as any);
    } catch (e) {
      console.error("Failed to update profile", e);
    }
  };

  const clearSelection = () => setSelectedMsgIds([]);

  const handleDeleteSelected = async () => {
    if (!activeChatId || selectedMsgIds.length === 0) return;
    if (confirm(`Удалить ${selectedMsgIds.length} сообщений?`)) {
      const batch = writeBatch(db);
      selectedMsgIds.forEach(id => {
        batch.delete(doc(db, `chats/${activeChatId}/messages`, id));
      });
      await batch.commit();
      clearSelection();
    }
  };

  const deleteSingleMessage = async (msgId: string) => {
    if (!activeChatId) return;
    await deleteDoc(doc(db, `chats/${activeChatId}/messages`, msgId));
  };

  const handleSendMessage = async (text: string, file?: File, isAudio?: boolean) => {
    if (!activeChatId) return;
    let messageData: any = {
      senderId: currentUser.id,
      timestamp: serverTimestamp(),
      status: 'sent',
      replyPreview: replyMessage ? { 
        senderName: replyMessage.senderId === currentUser.id ? 'Вы' : participant?.username || 'Собеседник', 
        text: replyMessage.text 
      } : null
    };
    if (isAudio && file) {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        messageData.audioUrl = reader.result as string;
        messageData.fileSize = `${(file.size / 1024).toFixed(1)} KB`;
        await addDoc(collection(db, `chats/${activeChatId}/messages`), messageData);
      };
      setReplyMessage(null);
      return;
    } else if (file) {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        messageData.fileUrl = reader.result as string;
        messageData.fileName = file.name;
        messageData.text = text;
        await addDoc(collection(db, `chats/${activeChatId}/messages`), messageData);
      };
      setReplyMessage(null);
      return;
    } else {
      messageData.text = text;
    }
    await addDoc(collection(db, `chats/${activeChatId}/messages`), messageData);
    await updateDoc(doc(db, 'chats', activeChatId), {
      lastMessage: {
        text: isAudio ? '🎙 Голосовое сообщение' : (file ? '🖼 Фотография' : text),
        timestamp: Date.now(),
        senderId: currentUser.id
      }
    });
    setReplyMessage(null);
  };

  const handleReaction = async (msgId: string, emoji: string) => {
    if (!activeChatId) return;
    const msgRef = doc(db, `chats/${activeChatId}/messages`, msgId);
    const chatMsgs = messages[activeChatId] || [];
    const msg = chatMsgs.find(m => m.id === msgId);
    if (!msg) return;
    const reactions = { ...(msg.reactions || {}) };
    if (!reactions[emoji]) reactions[emoji] = [];
    if (reactions[emoji].includes(currentUser.id)) {
      reactions[emoji] = reactions[emoji].filter(id => id !== currentUser.id);
    } else {
      reactions[emoji].push(currentUser.id);
    }
    await updateDoc(msgRef, { reactions });
  };

  const createNewChat = async (targetUser: User) => {
    const sortedIds = [currentUser.id, targetUser.id].sort();
    const consistentChatId = `c_${sortedIds[0]}_${sortedIds[1]}`;
    const chatDoc = await getDoc(doc(db, 'chats', consistentChatId));
    if (chatDoc.exists()) {
      setActiveChatId(consistentChatId);
      return;
    }
    await setDoc(doc(db, 'chats', consistentChatId), {
      type: 'private',
      participantsUids: [currentUser.id, targetUser.id],
      unreadCount: 0,
      createdAt: serverTimestamp()
    });
    setActiveChatId(consistentChatId);
  };

  const renderMessages = () => {
    const chatMsgs = messages[activeChatId!] || [];
    const elements: React.ReactNode[] = [];
    let lastDate: string | null = null;

    chatMsgs.forEach((msg, idx) => {
      const msgDate = new Date(msg.timestamp).toDateString();
      if (msgDate !== lastDate) {
        elements.push(
          <div key={`date-${msg.timestamp}`} className="flex justify-center my-3 animate-fade-in">
            <div className="bg-[#182533]/60 backdrop-blur-md px-3 py-1 rounded-full text-[12px] font-bold text-white/70 shadow-sm border border-white/5">
              {formatDateSeparator(msg.timestamp)}
            </div>
          </div>
        );
        lastDate = msgDate;
      }
      elements.push(
        <MessageBubble 
          key={msg.id} message={msg} isMe={msg.senderId === currentUser.id} 
          isSelected={selectedMsgIds.includes(msg.id)}
          onContextMenu={(e, m) => setContextMenu({ x: e.clientX, y: e.clientY, msg: m })} 
          onReaction={(emoji) => handleReaction(msg.id, emoji)} currentUserId={currentUser.id} 
        />
      );
    });

    return elements;
  };

  return (
    <div className="flex h-[100dvh] w-full bg-[#0e1621] overflow-hidden">
      <div className={`flex flex-col h-full bg-[#17212b] border-r border-[#0e1621] transition-all duration-300 
        ${activeChatId ? 'hidden md:flex md:w-80 lg:w-96' : 'w-full md:w-80 lg:w-96'}`}>
        <Sidebar chats={chats} activeChatId={activeChatId} onChatSelect={(id) => id === 'saved' ? openSavedMessages() : setActiveChatId(id)} activeTab={activeTab} onTabSelect={setActiveTab} currentUser={currentUser} onLogout={onLogout} onProfileOpen={() => setProfileUser(currentUser)} onNewChat={createNewChat} />
      </div>

      <div className={`flex-1 flex flex-col relative chat-bg min-w-0 transition-all duration-300 ${!activeChatId ? 'hidden md:flex' : 'flex h-full'}`}>
        {activeChat ? (
          <>
            {selectedMsgIds.length > 0 ? (
              <div className="h-16 bg-[#17212b] border-b border-[#0e1621] flex items-center px-4 gap-4 z-50 shrink-0 animate-slide-up pt-[env(safe-area-inset-top)] box-content">
                <div className="flex gap-2">
                  <button onClick={() => alert('Переслать: ' + selectedMsgIds.length)} className="bg-[#2481cc]/20 text-[#2481cc] px-4 py-2 rounded-lg font-bold text-xs uppercase hover:bg-[#2481cc]/30 transition-all">Переслать {selectedMsgIds.length}</button>
                  <button onClick={handleDeleteSelected} className="bg-red-500/20 text-red-400 px-4 py-2 rounded-lg font-bold text-xs uppercase hover:bg-red-500/30 transition-all">Удалить {selectedMsgIds.length}</button>
                </div>
                <div className="flex-1" />
                <button onClick={clearSelection} className="text-[#7f91a4] hover:text-white font-bold text-xs uppercase">Отмена</button>
              </div>
            ) : (
              <div className="h-16 bg-[#17212b]/95 backdrop-blur-xl border-b border-[#0e1621] flex items-center px-2 md:px-4 gap-1 md:gap-2 z-40 shrink-0 pt-[env(safe-area-inset-top)] box-content">
                <button onClick={() => setActiveChatId(null)} className="md:hidden p-3 -ml-2 text-[#7f91a4] hover:text-white transition-all"><i className="fa-solid fa-chevron-left text-lg"></i></button>
                <div className="flex-1 flex items-center gap-2 md:gap-3 cursor-pointer min-w-0" onClick={() => participant && setProfileUser(participant)}>
                    <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center ${activeChat.type === 'saved' ? 'bg-blue-500' : 'bg-slate-700'} overflow-hidden shadow-lg border border-white/5`}>
                      {activeChat.type === 'saved' ? <i className="fa-solid fa-bookmark text-white"></i> : <img src={participant?.avatarUrl} className="w-full h-full object-cover" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="font-bold text-[15px] md:text-[16px] leading-tight text-white flex items-center min-w-0">
                        <span className="truncate">{activeChat.type === 'saved' ? 'Избранное' : participant?.username}</span>
                        {activeChat.type !== 'saved' && participant?.verified && <VerifiedIcon className="ml-1" />}
                      </h2>
                      <span className={`text-[11px] block truncate ${participant?.online ? 'text-blue-400 font-bold' : 'text-[#7f91a4]'}`}>
                        {activeChat.type === 'saved' ? 'облако' : formatLastSeen(participant?.online || false, participant?.lastSeen || 0)}
                      </span>
                    </div>
                </div>
                <div className="flex items-center gap-0 text-[#7f91a4] shrink-0">
                    <button className="p-2 md:p-3 hover:text-white transition-all"><i className="fa-solid fa-magnifying-glass"></i></button>
                    <button className="p-2 md:p-3 hover:text-white transition-all"><i className="fa-solid fa-ellipsis-vertical"></i></button>
                </div>
              </div>
            )}

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 md:p-4 space-y-1 flex flex-col no-scrollbar">
              <div className="flex-1" />
              {renderMessages()}
            </div>

            <MessageInput chatId={activeChatId} currentUserId={currentUser.id} onSend={handleSendMessage} replyTo={replyMessage ? { senderName: replyMessage.senderId === currentUser.id ? 'Вы' : participant?.username || 'Собеседник', text: replyMessage.text } : null} onCancelReply={() => setReplyMessage(null)} />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-[#7f91a4]">
            <div className="bg-[#182533]/80 px-6 py-3 rounded-2xl text-center animate-fade-in border border-white/5 shadow-2xl">
              <i className="fas fa-dog text-4xl mb-3 opacity-20 block"></i>
              <span className="text-sm font-medium">Выберите чат, чтобы начать общение</span>
            </div>
          </div>
        )}
      </div>

      {profileUser && <ProfileModal user={profileUser} isMe={profileUser.id === currentUser.id} onUpdate={handleUpdateProfile} onClose={() => setProfileUser(null)} />}
      {contextMenu && (
        <ContextMenu 
          x={contextMenu.x} y={contextMenu.y} 
          onReaction={(emoji) => handleReaction(contextMenu.msg.id, emoji)}
          items={[
            { label: 'Ответить', icon: 'fa-reply', onClick: () => setReplyMessage(contextMenu.msg) },
            { label: 'Закрепить', icon: 'fa-thumbtack', onClick: () => alert('Закреплено') },
            { label: 'Копировать текст', icon: 'fa-copy', onClick: () => navigator.clipboard.writeText(contextMenu.msg.text) },
            { label: 'Переслать', icon: 'fa-share', onClick: () => alert('Переслать') },
            { label: 'Удалить', icon: 'fa-trash-can', onClick: () => deleteSingleMessage(contextMenu.msg.id), danger: true },
            { label: 'Выделить', icon: 'fa-circle-check', onClick: () => setSelectedMsgIds([contextMenu.msg.id]) }
          ]} 
          onClose={() => setContextMenu(null)} 
        />
      )}
    </div>
  );
};

export default Messenger;
