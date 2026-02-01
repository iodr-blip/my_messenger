
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { User, Message, Chat } from '../types';
import Sidebar from './Sidebar';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';
import ProfileModal from './ProfileModal';
import ContextMenu from './ContextMenu';
import GroupSettingsModal from './GroupSettingsModal';
import { db } from '../services/firebase';
import { 
  collection, 
  query, 
  onSnapshot, 
  doc, 
  addDoc, 
  updateDoc, 
  orderBy, 
  where,
  deleteDoc,
  serverTimestamp,
  getDoc,
  increment,
  limit,
  getDocs,
  setDoc,
  arrayUnion,
  arrayRemove,
  documentId,
  writeBatch
} from 'firebase/firestore';

export const VerifiedIcon = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 36 36" className={`w-[14px] h-[14px] flex-shrink-0 inline-block ${className}`} fill="none" xmlns="http://www.w3.org/2000/svg">
    <path fill="#0080FF" d="M15.13 1.848c1.46-2.514 5.057-2.45 6.429.115l1.253 2.343a3.677 3.677 0 0 0 3.762 1.926l2.597-.373c2.842-.408 5.036 2.493 3.92 5.182L32.07 13.5a3.804 3.804 0 0 0 .865 4.192l1.906 1.833c2.086 2.006 1.224 5.56-1.54 6.348l-2.525.721c-1.484.424-2.554 1.74-2.683 3.302l-.22 2.658c-.242 2.91-3.51 4.44-5.84 2.734l-2.13-1.558a3.644 3.644 0 0 0-4.21-.075l-2.181 1.482c-2.387 1.622-5.601-.023-5.743-2.94l-.129-2.664c-.076-1.566-1.1-2.919-2.568-3.395l-2.499-.81c-2.735-.887-3.474-4.469-1.32-6.4l1.967-1.763a3.801 3.801 0 0 0 1.008-4.16l-.935-2.492C2.27 7.785 4.563 4.963 7.39 5.472l2.582.465a3.673 3.673 0 0 0 3.826-1.791l1.333-2.298Z"></path>
    <path d="M12 18L16.5 22.5L24.5 14.5" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"></path>
  </svg>
);

const DateDivider = ({ date }: { date: string }) => (
  <div className="flex justify-center my-4 sticky top-2 z-30 pointer-events-none">
    <div className="bg-[#1c2a38]/60 backdrop-blur-md px-4 py-1 rounded-full border border-white/5 text-[12px] font-bold text-white shadow-sm">
      {date}
    </div>
  </div>
);

const CustomAlert = ({ message, onClose }: { message: string, onClose: () => void }) => (
  <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 animate-fade-in">
    <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
    <div className="relative bg-[#17212b] w-full max-w-[320px] rounded-xl shadow-2xl p-6 border border-white/5 animate-slide-up">
      <p className="text-white text-[15px] leading-relaxed mb-6 font-medium">{message}</p>
      <div className="flex justify-end">
        <button 
          onClick={onClose}
          className="text-[#3390ec] font-bold text-sm uppercase tracking-widest px-4 py-2 hover:bg-white/5 rounded-lg transition-all active:scale-95"
        >
          ОК
        </button>
      </div>
    </div>
  </div>
);

const Messenger: React.FC<{ user: User, onLogout: () => void }> = ({ user, onLogout }) => {
  const [currentUser] = useState<User>(user);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [chatParticipants, setChatParticipants] = useState<Record<string, User>>({});
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [groupSettingsChat, setGroupSettingsChat] = useState<Chat | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; msg?: Message } | null>(null);
  const [headerMenu, setHeaderMenu] = useState<{ x: number; y: number } | null>(null);
  const [replyMessage, setReplyMessage] = useState<Message | null>(null);
  const [participant, setParticipant] = useState<User | null>(null);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [showInviteBar, setShowInviteBar] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [inviteSearchQuery, setInviteSearchQuery] = useState('');
  const [inviteSearchResults, setInviteSearchResults] = useState<User[]>([]);

  const scrollRef = useRef<HTMLDivElement>(null);
  
  const activeChat = useMemo(() => {
    if (!activeChatId) return null;
    return chats.find(c => c.id === activeChatId) || (activeChatId === 'saved' ? ({ id: 'saved', type: 'saved', participants: [currentUser] } as Chat) : null);
  }, [chats, activeChatId, currentUser]);

  const scrollToBottom = (instant = false) => {
    if (scrollRef.current && !isSearching) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: instant ? 'auto' : 'smooth'
      });
    }
  };

  useEffect(() => {
    const q = query(collection(db, 'chats'), where('participantsUids', 'array-contains', currentUser.id));
    return onSnapshot(q, (snapshot) => {
      setChats(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[]);
    });
  }, [currentUser.id]);

  useEffect(() => {
    if (!activeChatId || activeChatId === 'saved') {
      setTypingUsers([]);
      return;
    }

    const typingRef = collection(db, 'chats', activeChatId, 'typing');
    const unsub = onSnapshot(typingRef, (snapshot) => {
      const uids = snapshot.docs
        .filter(d => d.id !== currentUser.id)
        .filter(d => {
          const data = d.data();
          return data.timestamp && (Date.now() - data.timestamp < 10000);
        })
        .map(d => d.id);
      
      setTypingUsers(uids);

      uids.forEach(async (uid) => {
        if (!chatParticipants[uid]) {
          const userDoc = await getDoc(doc(db, 'users', uid));
          if (userDoc.exists()) {
            setChatParticipants(prev => ({ ...prev, [uid]: { id: uid, ...userDoc.data() } as User }));
          }
        }
      });
    });

    return () => unsub();
  }, [activeChatId, currentUser.id, chatParticipants]);

  useEffect(() => {
    if (!activeChat || activeChat.type !== 'group' || !activeChat.participantsUids) return;

    const uids = activeChat.participantsUids.filter(uid => uid !== currentUser.id);
    if (uids.length === 0) return;

    const fetchParticipants = async () => {
      const newParticipants: Record<string, User> = {};
      const batches = [];
      for (let i = 0; i < uids.length; i += 10) {
        batches.push(uids.slice(i, i + 10));
      }

      for (const batch of batches) {
        const q = query(collection(db, 'users'), where(documentId(), 'in', batch));
        const snap = await getDocs(q);
        snap.forEach(d => {
          newParticipants[d.id] = { id: d.id, ...d.data() } as User;
        });
      }
      setChatParticipants(prev => ({ ...prev, ...newParticipants }));
    };

    fetchParticipants();
  }, [activeChatId, activeChat?.participantsUids]);

  useEffect(() => {
    if (!activeChatId) return;
    
    setIsSearching(false);
    setSearchQuery('');
    setShowInviteBar(true);

    if (activeChatId !== 'saved' && chats.some(c => c.id === activeChatId)) {
      updateDoc(doc(db, 'chats', activeChatId), { [`unreadCounts.${currentUser.id}`]: 0 }).catch(() => {});
    }

    const path = activeChatId === 'saved' ? `users/${currentUser.id}/saved_messages` : `chats/${activeChatId}/messages`;
    const q = query(collection(db, path), orderBy('timestamp', 'asc'));
    
    const unsub = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(d => {
        const data = d.data();
        return { 
          id: d.id, 
          senderId: data.senderId,
          text: data.text || '',
          timestamp: data.timestamp?.toMillis?.() || Date.now(),
          status: data.status || 'sent',
          reactions: data.reactions || {},
          replyPreview: data.replyPreview || null,
          audioUrl: data.audioUrl || ''
        };
      }) as Message[];

      // Filter messages based on user's cleared timestamp (soft delete for current user)
      const clearedAt = (activeChat as any)?.clearedAt?.[currentUser.id] || 0;
      const filteredMsgs = msgs.filter(m => m.timestamp > clearedAt);

      setMessages(prev => ({ ...prev, [activeChatId]: filteredMsgs }));
      requestAnimationFrame(() => scrollToBottom(filteredMsgs.length < 50));
    });

    return () => unsub();
  }, [activeChatId, currentUser.id, (activeChat as any)?.clearedAt?.[currentUser.id]]);

  useEffect(() => {
    if (!activeChatId || activeChatId === 'saved') {
      setParticipant(activeChatId === 'saved' ? currentUser : null);
      return;
    }
    
    const chatData = chats.find(c => c.id === activeChatId);
    if (chatData?.type === 'group') {
      setParticipant(null);
      return;
    }

    const otherId = chatData?.participantsUids?.find(id => id !== currentUser.id);
    if (otherId) {
      getDoc(doc(db, 'users', otherId)).then(d => {
        if (d.exists()) {
          const u = { id: d.id, ...d.data() } as User;
          setParticipant(u);
          setChatParticipants(prev => ({ ...prev, [u.id]: u }));
        }
      });
    }
  }, [activeChatId, chats, currentUser]);

  const handleCopyInviteLink = async () => {
    if (!activeChat) return;
    let link = activeChat.inviteLink;
    if (!link || !link.includes('mgn.me')) {
      const randomPart = Math.random().toString(36).substring(2, 10);
      link = `https://mgn.me/+${randomPart}`;
      await updateDoc(doc(db, 'chats', activeChat.id), { inviteLink: link });
    }
    navigator.clipboard.writeText(link);
    setAlertMessage('Ссылка скопирована в буфер обмена');
  };

  const handleInviteClick = async (link: string) => {
    try {
      const parts = link.split('+');
      const code = parts[parts.length - 1]?.trim();
      if (!code) return;

      const qNew = query(collection(db, 'chats'), where('inviteLink', '==', `https://mgn.me/+${code}`));
      const qOld = query(collection(db, 'chats'), where('inviteLink', '==', `mgn.zw/+${code}`));
      
      const [snapNew, snapOld] = await Promise.all([getDocs(qNew), getDocs(qOld)]);
      const targetDoc = !snapNew.empty ? snapNew.docs[0] : (!snapOld.empty ? snapOld.docs[0] : null);

      if (targetDoc) {
        const chatId = targetDoc.id;
        const chatData = targetDoc.data() as Chat;
        const participants = chatData.participantsUids || [];
        
        if (!participants.includes(currentUser.id)) {
          await updateDoc(doc(db, 'chats', chatId), { 
            participantsUids: arrayUnion(currentUser.id),
            [`unreadCounts.${currentUser.id}`]: 0
          });
          setAlertMessage('Вы присоединились к группе');
        }
        setActiveChatId(chatId);
      } else {
        setAlertMessage('Ссылка недействительна или группа была удалена');
      }
    } catch (e) {
      console.error(e);
      setAlertMessage('Ошибка при попытке входа в группу');
    }
  };

  const handleSendMessage = async (text: string, audioBlob?: Blob) => {
    if (!activeChatId) return;
    
    const now = Date.now();
    let audioUrl = '';
    
    if (audioBlob) {
      audioUrl = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(audioBlob);
      });
    }

    const msgData: any = {
      senderId: currentUser.id,
      text: text || '',
      timestamp: serverTimestamp(),
      status: 'sent'
    };

    if (audioUrl) msgData.audioUrl = audioUrl;

    if (replyMessage) {
      msgData.replyPreview = {
        senderName: replyMessage.senderId === currentUser.id ? 'Вы' : (chatParticipants[replyMessage.senderId]?.username || 'Собеседник'),
        text: replyMessage.text || (replyMessage.audioUrl ? '🎤 Голосовое сообщение' : 'Вложение')
      };
    }

    const path = activeChatId === 'saved' ? `users/${currentUser.id}/saved_messages` : `chats/${activeChatId}/messages`;
    await addDoc(collection(db, path), msgData);
    
    if (activeChatId !== 'saved') {
      const updates: any = {
        lastMessage: { 
          text: text || (audioUrl ? '🎤 Голосовое сообщение' : 'Вложение'), 
          timestamp: now, 
          senderId: currentUser.id 
        }
      };
      
      const chatData = chats.find(c => c.id === activeChatId);
      if (chatData?.type === 'group') {
        chatData.participantsUids?.forEach(uid => {
          if (uid !== currentUser.id) {
            updates[`unreadCounts.${uid}`] = increment(1);
          }
        });
      } else {
        const otherId = activeChatId.replace('c_', '').split('_').find(id => id !== currentUser.id);
        if (otherId) {
          updates[`unreadCounts.${otherId}`] = increment(1);
        }
      }
      await setDoc(doc(db, 'chats', activeChatId), updates, { merge: true });
    }
    
    setReplyMessage(null);
    requestAnimationFrame(() => scrollToBottom());
  };

  const handleReaction = async (message: Message, emoji: string) => {
    if (!activeChatId) return;
    const path = activeChatId === 'saved' ? `users/${currentUser.id}/saved_messages` : `chats/${activeChatId}/messages`;
    const msgRef = doc(db, path, message.id);
    
    const currentReactions = message.reactions || {};
    const users = currentReactions[emoji] || [];
    
    if (users.includes(currentUser.id)) {
      await updateDoc(msgRef, {
        [`reactions.${emoji}`]: arrayRemove(currentUser.id)
      });
    } else {
      await updateDoc(msgRef, {
        [`reactions.${emoji}`]: arrayUnion(currentUser.id)
      });
    }
  };

  const deleteMessage = async (msg: Message) => {
    if (!activeChatId) return;
    const path = activeChatId === 'saved' ? `users/${currentUser.id}/saved_messages` : `chats/${activeChatId}/messages`;
    await deleteDoc(doc(db, path, msg.id));
  };

  const handleClearHistory = async () => {
    if (!activeChatId) return;
    if (activeChatId === 'saved') {
      const path = `users/${currentUser.id}/saved_messages`;
      const snap = await getDocs(collection(db, path));
      const batch = writeBatch(db);
      snap.docs.forEach(d => batch.delete(d.ref));
      await batch.commit();
      setAlertMessage('История очищена');
    } else {
      // Soft delete: update user-specific clearedAt timestamp
      await updateDoc(doc(db, 'chats', activeChatId), {
        [`clearedAt.${currentUser.id}`]: Date.now()
      });
      setAlertMessage('История очищена для Вас');
    }
    setHeaderMenu(null);
  };

  const handleDeleteChat = async () => {
    if (!activeChatId) return;
    if (activeChatId === 'saved') {
      await handleClearHistory();
    } else {
      // Leave chat / Hide for current user
      await updateDoc(doc(db, 'chats', activeChatId), {
        participantsUids: arrayRemove(currentUser.id)
      });
      setActiveChatId(null);
      setAlertMessage('Чат удален');
    }
    setHeaderMenu(null);
  };

  const formatDividerDate = (timestamp: number) => {
    const d = new Date(timestamp);
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (d.toDateString() === now.toDateString()) return 'Сегодня';
    if (d.toDateString() === yesterday.toDateString()) return 'Вчера';
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
  };

  const groupedMessages = useMemo(() => {
    let msgs = messages[activeChatId!] || [];
    if (isSearching && searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      msgs = msgs.filter(m => m.text.toLowerCase().includes(q));
    }

    const groups: { date: string, items: Message[] }[] = [];
    let currentGroup: { date: string, items: Message[] } | null = null;
    msgs.forEach(m => {
      const dateStr = formatDividerDate(m.timestamp);
      if (!currentGroup || currentGroup.date !== dateStr) {
        currentGroup = { date: dateStr, items: [] };
        groups.push(currentGroup);
      }
      currentGroup.items.push(m);
    });
    return groups;
  }, [messages, activeChatId, isSearching, searchQuery]);

  const handleHeaderClick = () => {
    if (activeChat?.type === 'group') {
      setGroupSettingsChat(activeChat);
    } else if (participant) {
      setProfileUser(participant);
    }
  };

  const renderStatusSubtext = () => {
    if (typingUsers.length > 0) {
      let typingText = 'печатает';
      
      if (activeChat?.type === 'group') {
        if (typingUsers.length === 1) {
          typingText = `${chatParticipants[typingUsers[0]]?.username || 'Участник'} печатает`;
        } else if (typingUsers.length > 1 && typingUsers.length < 4) {
          const names = typingUsers.map(uid => chatParticipants[uid]?.username || 'Участник').join(', ');
          typingText = `${names} печатают`;
        } else {
          typingText = `${typingUsers.length} человека печатают`;
        }
      }

      return (
        <span className="text-[11px] block text-blue-400 font-medium animate-fade-in flex items-center gap-1.5">
          <span className="flex items-center">
            <span className="typing-dot"></span>
            <span className="typing-dot"></span>
            <span className="typing-dot"></span>
          </span>
          {typingText}
        </span>
      );
    }

    return (
      <span className={`text-[11px] block ${participant?.online ? 'text-blue-400' : 'text-[#7f91a4]'}`}>
        {activeChat?.type === 'saved' ? 'Ваше личное облако' : activeChat?.type === 'group' ? `${activeChat.participantsUids?.length} участников` : participant?.online ? 'в сети' : 'был(а) недавно'}
      </span>
    );
  };

  return (
    <div className="flex h-full w-full bg-[#0e1621] overflow-hidden">
      <div className={`flex-shrink-0 flex flex-col h-full bg-[#17212b] border-r border-[#0e1621] transition-all duration-300 ${activeChatId ? 'hidden md:flex md:w-80 lg:w-96' : 'w-full md:w-80 lg:w-96'}`}>
        <Sidebar 
          chats={chats} activeChatId={activeChatId} onChatSelect={setActiveChatId} 
          currentUser={currentUser} onLogout={onLogout} 
          onProfileOpen={(u) => setProfileUser(u || currentUser)} 
          onNewChat={(u) => { setProfileUser(null); setActiveChatId(`c_${[currentUser.id, u.id].sort().join('_')}`); }} 
          activeTab={0 as any} onTabSelect={() => {}}
        />
      </div>

      <div className={`flex-1 flex flex-col relative min-w-0 transition-all duration-300 ${!activeChatId ? 'hidden md:flex' : 'flex h-full'}`}>
        {activeChatId ? (
          <>
            <div className="h-16 bg-[#17212b] border-b border-[#0e1621] flex items-center px-4 gap-2 z-40 shrink-0">
              {isSearching ? (
                <div className="flex-1 flex items-center gap-2 animate-fade-in">
                  <button onClick={() => { setIsSearching(false); setSearchQuery(''); }} className="p-2 text-[#7f91a4] hover:text-white">
                    <i className="fa-solid fa-arrow-left text-lg"></i>
                  </button>
                  <input autoFocus type="text" placeholder="Поиск сообщений..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="flex-1 bg-transparent outline-none text-white text-sm" />
                </div>
              ) : (
                <>
                  <button onClick={() => setActiveChatId(null)} className="md:hidden p-2 text-[#7f91a4] hover:text-white"><i className="fa-solid fa-chevron-left text-xl"></i></button>
                  <div className="flex-1 flex items-center gap-3 cursor-pointer min-w-0" onClick={handleHeaderClick}>
                    <div className="relative shrink-0">
                      {activeChat?.type === 'saved' ? (
                        <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white"><i className="fa-solid fa-bookmark"></i></div>
                      ) : activeChat?.type === 'group' ? (
                        <img src={activeChat.avatarUrl} className="w-10 h-10 rounded-full object-cover border border-white/5" alt="group" />
                      ) : (
                        <>
                          <img src={participant?.avatarUrl} className="w-10 h-10 rounded-full object-cover border border-white/5" alt="avatar" />
                          {participant?.online && <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-[#17212b] rounded-full"></div>}
                        </>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="font-bold text-white truncate flex items-center gap-1.5 leading-tight">
                        {activeChat?.type === 'saved' ? 'Избранное' : activeChat?.type === 'group' ? activeChat.name : (participant?.username || 'Загрузка...')} 
                        {participant?.verified && <VerifiedIcon />}
                      </h2>
                      {renderStatusSubtext()}
                    </div>
                  </div>
                  <button onClick={(e) => setHeaderMenu({ x: e.clientX, y: e.clientY })} className="p-2 text-[#7f91a4] hover:text-white transition-all"><i className="fa-solid fa-ellipsis-vertical text-lg"></i></button>
                </>
              )}
            </div>

            {activeChat?.type === 'group' && showInviteBar && (
              <div className="bg-[#17212b] border-b border-[#0e1621] flex items-center justify-center px-4 py-3 animate-fade-in relative z-30 shadow-md">
                <button 
                  onClick={() => setShowInviteModal(true)}
                  className="text-blue-400 text-sm font-bold hover:underline"
                >
                  Добавить участников
                </button>
                <button onClick={() => setShowInviteBar(false)} className="absolute right-4 text-[#7f91a4] hover:text-white p-1">
                  <i className="fa-solid fa-xmark"></i>
                </button>
              </div>
            )}

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 pt-0 no-scrollbar scroll-smooth chat-bg">
              {groupedMessages.length > 0 ? groupedMessages.map((group) => (
                <React.Fragment key={group.date}>
                  <DateDivider date={group.date} />
                  <div className="space-y-1">
                    {group.items.map(m => {
                      const sender = chatParticipants[m.senderId];
                      return (
                        <MessageBubble 
                          key={m.id} message={m} isMe={m.senderId === currentUser.id} 
                          currentUserId={currentUser.id} currentUserAvatar={currentUser.avatarUrl}
                          participantAvatar={sender?.avatarUrl}
                          senderName={sender?.username}
                          chatType={activeChat?.type}
                          onReaction={(emoji) => handleReaction(m, emoji)}
                          onMentionClick={() => {}} 
                          onPhoneClick={() => {}}
                          onInviteClick={handleInviteClick}
                          onContextMenu={(e, msg) => setContextMenu({ x: e.clientX, y: e.clientY, msg: { ...msg } })} 
                        />
                      );
                    })}
                  </div>
                </React.Fragment>
              )) : (
                <div className="h-full flex items-center justify-center text-[#7f91a4]/30">
                  <i className="fa-solid fa-message text-6xl"></i>
                </div>
              )}
            </div>

            <div className={`shrink-0 bg-[#17212b] border-t border-[#0e1621] z-50`}>
              <MessageInput chatId={activeChatId} currentUserId={currentUser.id} onSend={handleSendMessage} replyTo={replyMessage ? { senderName: replyMessage.senderId === currentUser.id ? 'Вы' : (chatParticipants[replyMessage.senderId]?.username || 'Собеседник'), text: replyMessage.text || (replyMessage.audioUrl ? '🎤 Голосовое сообщение' : 'Вложение') } : null} onCancelReply={() => setReplyMessage(null)} />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-[#7f91a4] chat-bg">
            <div className="bg-[#1c2a38]/60 backdrop-blur-md px-6 py-2 rounded-full border border-white/5 text-sm font-medium">Выберите чат, чтобы начать общение</div>
          </div>
        )}
      </div>

      {showInviteModal && (
        <div className="fixed inset-0 z-[500] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#17212b] w-full max-w-[340px] rounded-[32px] overflow-hidden shadow-2xl animate-slide-up flex flex-col border border-white/5 max-h-[80vh]">
            <div className="p-4 border-b border-[#0e1621] flex items-center justify-between bg-[#17212b]/80 backdrop-blur-xl shrink-0">
              <span className="font-bold text-white text-[16px]">Добавить участников</span>
              <button onClick={() => { setShowInviteModal(false); setInviteSearchQuery(''); }} className="text-[#7f91a4] p-1.5 active:scale-90 transition-transform"><i className="fa-solid fa-xmark text-lg"></i></button>
            </div>
            <div className="p-4 space-y-4 overflow-y-auto no-scrollbar flex-1 bg-[#17212b]/50">
              <div className="bg-[#0e1621] rounded-2xl flex items-center gap-3 px-4 py-3 border border-white/5 shadow-inner focus-within:border-blue-500/30 transition-all">
                <i className="fa-solid fa-magnifying-glass text-[13px] text-[#7f91a4]"></i>
                <input 
                  type="text" 
                  placeholder="Поиск людей..." 
                  className="bg-transparent outline-none text-sm text-white flex-1 placeholder-[#7f91a4]" 
                  value={inviteSearchQuery}
                  onChange={e => setInviteSearchQuery(e.target.value)}
                />
              </div>

              {inviteSearchQuery.length <= 1 ? (
                <button 
                  onClick={handleCopyInviteLink}
                  className="w-full flex items-center gap-4 p-4 hover:bg-white/5 transition-all text-left rounded-2xl active:scale-95 group"
                >
                  <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 group-hover:bg-blue-500/20 transition-colors">
                    <i className="fa-solid fa-link text-lg"></i>
                  </div>
                  <div className="flex-1">
                    <div className="text-blue-400 font-bold text-[15px]">Приглашить в группу по ссылке</div>
                  </div>
                </button>
              ) : (
                <div className="space-y-1">
                  {inviteSearchResults.map(u => {
                    const isAlreadyInGroup = activeChat?.participantsUids?.includes(u.id);
                    return (
                      <button 
                        key={u.id}
                        disabled={isAlreadyInGroup}
                        onClick={async () => {
                          if (!activeChat) return;
                          await updateDoc(doc(db, 'chats', activeChat.id), { 
                            participantsUids: arrayUnion(u.id) 
                          });
                          setShowInviteModal(false);
                          setInviteSearchQuery('');
                        }}
                        className={`w-full flex items-center gap-3.5 p-3 rounded-2xl transition-all text-left group ${isAlreadyInGroup ? 'opacity-80 cursor-default' : 'hover:bg-white/5 active:scale-[0.98]'}`}
                      >
                        <div className="relative shrink-0">
                          <img src={u.avatarUrl} className="w-11 h-11 rounded-full border border-white/10 object-cover" />
                          {isAlreadyInGroup && (
                            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#3390ec] rounded-full flex items-center justify-center border-2 border-[#17212b] shadow-lg animate-fade-in scale-110">
                              <i className="fa-solid fa-check text-[10px] text-white"></i>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-white font-bold text-[15px] truncate flex items-center gap-1.5">
                            {u.username}
                            {u.verified && <VerifiedIcon />}
                          </div>
                          <div className="text-blue-400 text-[12px] font-bold">{u.username_handle}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {headerMenu && (
        <ContextMenu 
          x={headerMenu.x} 
          y={headerMenu.y} 
          onReaction={() => {}} 
          hideReactions={true} 
          items={[
            { label: 'Поиск в чате', icon: 'fa-magnifying-glass', onClick: () => setIsSearching(true) },
            { label: 'Очистить историю', icon: 'fa-broom', onClick: handleClearHistory },
            { label: 'Удалить чат', icon: 'fa-trash-can', onClick: handleDeleteChat, danger: true }
          ]} 
          onClose={() => setHeaderMenu(null)} 
        />
      )}

      {contextMenu && (
        <ContextMenu 
          x={contextMenu.x} 
          y={contextMenu.y} 
          onReaction={(emoji) => contextMenu.msg && handleReaction(contextMenu.msg, emoji)} 
          items={[{ label: 'Ответить', icon: 'fa-reply', onClick: () => setReplyMessage(contextMenu.msg!) }, { label: 'Копировать', icon: 'fa-copy', onClick: () => contextMenu.msg && navigator.clipboard.writeText(contextMenu.msg.text) }, { label: 'Удалить', icon: 'fa-trash-can', onClick: () => contextMenu.msg && deleteMessage(contextMenu.msg), danger: true }]} 
          onClose={() => setContextMenu(null)} 
        />
      )}
      
      {profileUser && <ProfileModal user={profileUser} currentUser={currentUser} isMe={profileUser.id === currentUser.id} onClose={() => setProfileUser(null)} onUpdate={(u) => updateDoc(doc(db, 'users', u.id), u as any)} />}
      {groupSettingsChat && <GroupSettingsModal chat={groupSettingsChat} currentUser={currentUser} onClose={() => setGroupSettingsChat(null)} onExitGroup={() => { setGroupSettingsChat(null); setActiveChatId(null); }} onAddParticipant={() => setShowInviteModal(true)} onProfileClick={(u) => setProfileUser(u)} />}
      {alertMessage && <CustomAlert message={alertMessage} onClose={() => setAlertMessage(null)} />}
    </div>
  );
};

export default Messenger;
