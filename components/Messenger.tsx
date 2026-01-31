
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { User, Message, Chat, AppTab, CallSession } from '../types';
import Sidebar from './Sidebar';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';
import ProfileModal from './ProfileModal';
import MediaSendModal from './MediaSendModal';
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
  deleteField,
  getDocs,
  writeBatch,
  increment,
  limit
} from 'firebase/firestore';

// WebRTC Configuration
const iceServers = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ]
};

const FullImageViewer: React.FC<{ src: string, onClose: () => void }> = ({ src, onClose }) => (
  <div 
    className="fixed inset-0 z-[500] bg-black/90 backdrop-blur-xl flex flex-col animate-fade-in items-center justify-center p-4 md:p-12"
    onClick={onClose}
  >
    <div className="absolute top-6 right-6 z-10">
      <button onClick={onClose} className="text-white/60 hover:text-white p-3 transition-all bg-white/10 rounded-full backdrop-blur-md">
        <i className="fa-solid fa-xmark text-2xl"></i>
      </button>
    </div>
    <div className="relative max-w-full max-h-full flex items-center justify-center">
      <img 
        src={src} 
        className="max-w-full max-h-[90vh] object-contain shadow-[0_0_100px_rgba(0,0,0,0.8)] rounded-2xl animate-slide-up select-none border border-white/5" 
        alt="Full size" 
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  </div>
);

interface CallOverlayProps {
  user: User;
  onClose: () => void;
  onAccept?: () => void;
  isIncoming: boolean;
  status: 'ringing' | 'active';
}

const CallOverlay: React.FC<CallOverlayProps> = ({ user, onClose, onAccept, isIncoming, status }) => {
  const [seconds, setSeconds] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(true);

  useEffect(() => {
    if (status === 'active') {
      const timer = setInterval(() => setSeconds(s => s + 1), 1000);
      return () => clearInterval(timer);
    }
  }, [status]);

  const formatTime = (s: number) => {
    const min = Math.floor(s / 60);
    const sec = s % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-[1000] bg-[#0e1621] flex flex-col items-center justify-between py-16 px-8 animate-fade-in overflow-hidden">
      <div className="absolute inset-0 opacity-30 blur-[100px] scale-150 pointer-events-none transition-opacity duration-1000">
        <img src={user.avatarUrl} className="w-full h-full object-cover" />
      </div>
      
      <div className="flex flex-col items-center gap-6 mt-12 relative z-10 animate-slide-up">
        <div className="relative group">
          <div className="absolute -inset-4 bg-blue-500/20 rounded-full blur-2xl animate-pulse"></div>
          <img 
            src={user.avatarUrl} 
            className="w-36 h-36 rounded-full border-4 border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] object-cover relative z-10" 
            alt={user.username}
          />
          {status === 'ringing' && <div className="absolute inset-0 rounded-full border border-blue-400/30 animate-ping opacity-20 pointer-events-none"></div>}
        </div>
        <div className="text-center space-y-1">
          <h2 className="text-3xl font-bold text-white tracking-tight">{user.username}</h2>
          <p className="text-blue-400 font-black uppercase tracking-[0.3em] text-[11px] animate-pulse">
            {isIncoming && status === 'ringing' ? 'Входящий звонок' : status === 'active' ? `Звонок • ${formatTime(seconds)}` : 'Вызов...'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-8 mb-12 relative z-10 animate-slide-up">
        {isIncoming && status === 'ringing' ? (
          <>
            <button 
              onClick={onClose} 
              className="w-20 h-20 rounded-full bg-red-500 flex items-center justify-center text-white text-3xl shadow-[0_10px_40px_rgba(239,68,68,0.4)] active:scale-95 transition-all"
            >
              <i className="fa-solid fa-phone-slash rotate-[135deg]"></i>
            </button>
            <button 
              onClick={onAccept} 
              className="w-20 h-20 rounded-full bg-green-500 flex items-center justify-center text-white text-3xl shadow-[0_10px_40px_rgba(34,197,94,0.4)] active:scale-95 transition-all animate-bounce"
            >
              <i className="fa-solid fa-phone"></i>
            </button>
          </>
        ) : (
          <>
            <button onClick={() => setIsMuted(!isMuted)} className={`w-16 h-16 rounded-full flex items-center justify-center text-xl transition-all active:scale-90 border border-white/5 ${isMuted ? 'bg-white text-[#0e1621]' : 'bg-white/10 text-white hover:bg-white/20'}`}>
              <i className={`fa-solid ${isMuted ? 'fa-microphone-slash' : 'fa-microphone'}`}></i>
            </button>
            <button onClick={onClose} className="w-20 h-20 rounded-full bg-red-500 flex items-center justify-center text-white text-3xl shadow-[0_10px_40px_rgba(239,68,68,0.4)] active:scale-95 transition-all group">
              <i className="fa-solid fa-phone-slash rotate-[135deg] group-hover:scale-110 transition-transform"></i>
            </button>
            <button onClick={() => setIsSpeaker(!isSpeaker)} className={`w-16 h-16 rounded-full flex items-center justify-center text-xl transition-all active:scale-90 border border-white/5 ${!isSpeaker ? 'bg-white text-[#0e1621]' : 'bg-white/10 text-white hover:bg-white/20'}`}>
              <i className={`fa-solid ${isSpeaker ? 'fa-volume-high' : 'fa-volume-xmark'}`}></i>
            </button>
          </>
        )}
      </div>
    </div>
  );
};

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
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; msg?: Message, type: 'msg' | 'header' } | null>(null);
  const [replyMessage, setReplyMessage] = useState<Message | null>(null);
  const [participant, setParticipant] = useState<User | null>(null);
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const [viewingImageUrl, setViewingImageUrl] = useState<string | null>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  
  // Call States
  const [activeCall, setActiveCall] = useState<{ peer: User, isIncoming: boolean, status: 'ringing' | 'active', sessionId?: string } | null>(null);
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const localStream = useRef<MediaStream | null>(null);

  const [isSearching, setIsSearching] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState('');

  const scrollRef = useRef<HTMLDivElement>(null);
  const activeChat = useMemo(() => chats.find(c => c.id === activeChatId), [chats, activeChatId]);

  const scrollToBottom = (behavior: 'auto' | 'smooth' = 'auto') => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: behavior
      });
    }
  };

  useEffect(() => {
    if (!isSearching && activeChatId) scrollToBottom('auto');
  }, [messages, activeChatId, isSearching]);

  useEffect(() => {
    return onSnapshot(doc(db, 'users', user.id), (docSnap) => {
      if (docSnap.exists()) {
        setCurrentUser({ id: docSnap.id, ...docSnap.data() } as User);
      }
    });
  }, [user.id]);

  useEffect(() => {
    const q = query(collection(db, 'chats'), where('participantsUids', 'array-contains', currentUser.id));
    return onSnapshot(q, (snapshot) => {
      setChats(snapshot.docs.map(doc => {
        const data = doc.data();
        return { 
          id: doc.id, 
          ...data,
          unreadCount: data.unreadCount || data.unreadCounts?.[currentUser.id] || 0,
          createdAt: data.createdAt?.toMillis?.() || Date.now()
        };
      }) as any[]);
    });
  }, [currentUser.id]);

  useEffect(() => {
    if (!activeChatId) return;

    // Reset unread count for the active chat
    updateDoc(doc(db, 'chats', activeChatId), {
      [`unreadCounts.${currentUser.id}`]: 0
    });

    const q = query(collection(db, `chats/${activeChatId}/messages`), orderBy('timestamp', 'asc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chatMsgs = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        if (data.senderId !== currentUser.id && data.status !== 'read') {
          updateDoc(doc(db, `chats/${activeChatId}/messages`, docSnap.id), { status: 'read' });
        }
        const ts = data.timestamp?.toMillis?.() || (typeof data.timestamp === 'number' ? data.timestamp : Date.now());
        return { 
          id: docSnap.id, 
          ...data, 
          timestamp: ts 
        };
      }) as Message[];

      setMessages(prev => ({ ...prev, [activeChatId]: chatMsgs }));
    });

    return unsubscribe;
  }, [activeChatId, currentUser.id]);

  // Handle Incoming Calls Listener
  useEffect(() => {
    const q = query(
      collection(db, 'calls'), 
      where('receiverId', '==', currentUser.id), 
      where('status', '==', 'ringing'),
      limit(1)
    );
    
    return onSnapshot(q, async (snapshot) => {
      if (!snapshot.empty) {
        const callData = snapshot.docs[0].data() as CallSession;
        const callerDoc = await getDoc(doc(db, 'users', callData.callerId));
        if (callerDoc.exists() && !activeCall) {
          setActiveCall({
            peer: { id: callerDoc.id, ...callerDoc.data() } as User,
            isIncoming: true,
            status: 'ringing',
            sessionId: snapshot.docs[0].id
          });
        }
      }
    });
  }, [currentUser.id, activeCall]);

  // WebRTC Signal Listener for active session
  useEffect(() => {
    if (!activeCall?.sessionId) return;
    return onSnapshot(doc(db, 'calls', activeCall.sessionId), async (docSnap) => {
      if (!docSnap.exists()) {
        endCall();
        return;
      }
      const data = docSnap.data() as CallSession;
      if (data.status === 'ended' || data.status === 'declined') {
        endCall();
      } else if (data.status === 'active' && !activeCall.isIncoming && data.answer && peerConnection.current) {
        // We are the caller, we got the answer
        await peerConnection.current.setRemoteDescription(new RTCSessionDescription(data.answer));
        setActiveCall(prev => prev ? { ...prev, status: 'active' } : null);
      }
    });
  }, [activeCall?.sessionId]);

  const startCall = async (targetUser: User) => {
    try {
      localStream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      peerConnection.current = new RTCPeerConnection(iceServers);
      
      localStream.current.getTracks().forEach(track => {
        peerConnection.current?.addTrack(track, localStream.current!);
      });

      peerConnection.current.ontrack = (event) => {
        const remoteAudio = new Audio();
        remoteAudio.srcObject = event.streams[0];
        remoteAudio.play();
      };

      const offer = await peerConnection.current.createOffer();
      await peerConnection.current.setLocalDescription(offer);

      const callRef = await addDoc(collection(db, 'calls'), {
        callerId: currentUser.id,
        receiverId: targetUser.id,
        status: 'ringing',
        type: 'audio',
        offer: { type: offer.type, sdp: offer.sdp },
        createdAt: Date.now()
      });

      setActiveCall({
        peer: targetUser,
        isIncoming: false,
        status: 'ringing',
        sessionId: callRef.id
      });
    } catch (e) {
      console.error("Call failed:", e);
    }
  };

  const acceptCall = async () => {
    if (!activeCall?.sessionId) return;
    try {
      const callDoc = await getDoc(doc(db, 'calls', activeCall.sessionId));
      const callData = callDoc.data() as CallSession;

      localStream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      peerConnection.current = new RTCPeerConnection(iceServers);
      
      localStream.current.getTracks().forEach(track => {
        peerConnection.current?.addTrack(track, localStream.current!);
      });

      peerConnection.current.ontrack = (event) => {
        const remoteAudio = new Audio();
        remoteAudio.srcObject = event.streams[0];
        remoteAudio.play();
      };

      await peerConnection.current.setRemoteDescription(new RTCSessionDescription(callData.offer));
      const answer = await peerConnection.current.createAnswer();
      await peerConnection.current.setLocalDescription(answer);

      await updateDoc(doc(db, 'calls', activeCall.sessionId), {
        status: 'active',
        answer: { type: answer.type, sdp: answer.sdp }
      });

      setActiveCall(prev => prev ? { ...prev, status: 'active' } : null);
    } catch (e) {
      console.error("Accept failed:", e);
      endCall();
    }
  };

  const endCall = async () => {
    if (activeCall?.sessionId) {
      await updateDoc(doc(db, 'calls', activeCall.sessionId), { status: 'ended' });
    }
    if (localStream.current) {
      localStream.current.getTracks().forEach(t => t.stop());
      localStream.current = null;
    }
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    setActiveCall(null);
  };

  useEffect(() => {
    if (activeChat && activeChat.type !== 'saved') {
      const otherId = activeChat.participantsUids?.find((id: string) => id !== currentUser.id);
      if (otherId) {
        const unsubUser = onSnapshot(doc(db, 'users', otherId), (docSnap) => {
          if (docSnap.exists()) setParticipant({ id: docSnap.id, ...docSnap.data() } as User);
        });
        const unsubTyping = onSnapshot(doc(db, 'chats', activeChat.id, 'typing', otherId), (docSnap) => {
          setIsOtherTyping(docSnap.exists());
        });
        return () => { unsubUser(); unsubTyping(); };
      }
    } else {
      setParticipant(null);
      setIsOtherTyping(false);
    }
  }, [activeChatId, currentUser.id]);

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

    const sendMessageToFirestore = async (data: any) => {
      await addDoc(collection(db, `chats/${activeChatId}/messages`), data);
      
      let lastText = text || (isAudio ? '🎙 Голосовое сообщение' : (file?.type.startsWith('video/') ? '📹 Видео' : (file?.type.startsWith('image/') ? '🖼 Фото' : '📁 Файл')));
      
      const otherId = activeChat?.participantsUids?.find(uid => uid !== currentUser.id);
      const updates: any = {
        lastMessage: { text: lastText, timestamp: Date.now(), senderId: currentUser.id }
      };
      
      if (otherId) {
        updates[`unreadCounts.${otherId}`] = increment(1);
      }
      
      await updateDoc(doc(db, 'chats', activeChatId), updates);
      
      // Browser notification
      if (participant && "Notification" in window && Notification.permission === "granted" && document.hidden) {
        new Notification(currentUser.username, {
          body: lastText,
          icon: currentUser.avatarUrl
        });
      }
    };

    if (isAudio && file) {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        messageData.audioUrl = reader.result as string;
        messageData.fileSize = `${(file.size / 1024).toFixed(1)} KB`;
        await sendMessageToFirestore(messageData);
        scrollToBottom('auto');
      };
    } else if (file) {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        messageData.fileUrl = reader.result as string;
        messageData.fileName = file.name;
        messageData.text = text;
        await sendMessageToFirestore(messageData);
        scrollToBottom('auto');
      };
    } else {
      messageData.text = text;
      await sendMessageToFirestore(messageData);
      scrollToBottom('auto');
    }
    setReplyMessage(null);
  };

  const handleReaction = async (msgId: string, emoji: string) => {
    if (!activeChatId) return;
    const msgRef = doc(db, `chats/${activeChatId}/messages`, msgId);
    const msg = (messages[activeChatId] || []).find(m => m.id === msgId);
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

  const togglePinMessage = async (msgId: string) => {
    if (!activeChatId) return;
    const isPinned = activeChat?.pinnedMessageId === msgId;
    await updateDoc(doc(db, 'chats', activeChatId), { pinnedMessageId: isPinned ? null : msgId });
  };

  const jumpToMessage = (msgId: string) => {
    setIsSearching(false);
    setChatSearchQuery('');
    setTimeout(() => {
      const el = document.getElementById(`msg-${msgId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('bg-blue-500/20');
        setTimeout(() => el.classList.remove('bg-blue-500/20'), 1500);
      }
    }, 100);
  };

  const getSearchResults = () => {
    if (!activeChatId || !chatSearchQuery.trim()) return [];
    return (messages[activeChatId] || []).filter(msg => 
      msg.text?.toLowerCase().includes(chatSearchQuery.toLowerCase())
    ).reverse();
  };

  const pinnedMessage = useMemo(() => {
    if (!activeChat?.pinnedMessageId) return null;
    return (messages[activeChatId!] || []).find(m => m.id === activeChat.pinnedMessageId);
  }, [activeChat?.pinnedMessageId, messages, activeChatId]);

  const renderMessages = () => {
    const chatMsgs = messages[activeChatId!] || [];
    const elements: React.ReactNode[] = [];
    let lastDate: string | null = null;
    chatMsgs.forEach((msg) => {
      const msgDate = new Date(msg.timestamp).toDateString();
      if (msgDate !== lastDate) {
        elements.push(<div key={`date-${msg.timestamp}`} className="flex justify-center my-3 animate-fade-in"><div className="bg-[#182533]/60 backdrop-blur-md px-3 py-1 rounded-full text-[12px] font-bold text-white/70 shadow-sm border border-white/5">{formatDateSeparator(msg.timestamp)}</div></div>);
        lastDate = msgDate;
      }
      elements.push(<MessageBubble key={msg.id} message={msg} isMe={msg.senderId === currentUser.id} onContextMenu={(e, m) => setContextMenu({ x: e.clientX, y: e.clientY, msg: m, type: 'msg' })} onReaction={(emoji) => handleReaction(msg.id, emoji)} onImageClick={(url) => setViewingImageUrl(url)} currentUserId={currentUser.id} />);
    });
    return elements;
  };

  return (
    <div className="flex h-[100dvh] w-full bg-[#0e1621] overflow-hidden">
      <div className={`flex flex-col h-full bg-[#17212b] border-r border-[#0e1621] transition-all duration-300 
        ${activeChatId ? 'hidden md:flex md:w-80 lg:w-96' : 'w-full md:w-80 lg:w-96'}`}>
        {/* Fix: Directly call setActiveChatId with the passed id to handle both normal chats and 'saved' messages. */}
        <Sidebar chats={chats} activeChatId={activeChatId} onChatSelect={(id) => { setActiveChatId(id); setIsSearching(false); }} activeTab={activeTab} onTabSelect={setActiveTab} currentUser={currentUser} onLogout={onLogout} onProfileOpen={() => setProfileUser(currentUser)} onNewChat={(u) => { setProfileUser(null); setActiveChatId(null); setTimeout(() => setActiveChatId(`c_${[currentUser.id, u.id].sort().join('_')}`), 10); }} />
      </div>

      <div className={`flex-1 flex flex-col relative chat-bg min-w-0 transition-all duration-300 ${!activeChatId ? 'hidden md:flex' : 'flex h-full'}`}>
        {activeChat ? (
          <>
            <div className="h-16 bg-[#17212b]/95 backdrop-blur-xl border-b border-[#0e1621] flex items-center px-2 md:px-4 gap-1 md:gap-2 z-40 shrink-0 pt-[env(safe-area-inset-top)] box-content">
              {isSearching ? (
                <div className="flex-1 flex items-center gap-2 animate-fade-in">
                  <button onClick={() => setIsSearching(false)} className="text-[#7f91a4] hover:text-white p-2 transition-colors"><i className="fa-solid fa-chevron-left"></i></button>
                  <input autoFocus type="text" placeholder="Поиск сообщений" value={chatSearchQuery} onChange={(e) => setChatSearchQuery(e.target.value)} className="flex-1 bg-transparent text-white outline-none font-medium placeholder:text-[#7f91a4]" />
                  {chatSearchQuery && (<button onClick={() => setChatSearchQuery('')} className="text-[#7f91a4] p-2 hover:text-white transition-all"><i className="fa-solid fa-xmark"></i></button>)}
                </div>
              ) : (
                <>
                  <button onClick={() => setActiveChatId(null)} className="md:hidden p-3 -ml-2 text-[#7f91a4] hover:text-white transition-all active:scale-90"><i className="fa-solid fa-chevron-left text-lg"></i></button>
                  <div className="flex-1 flex items-center gap-2 md:gap-3 cursor-pointer min-w-0" onClick={() => participant && setProfileUser(participant)}>
                      <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center ${activeChat.type === 'saved' ? 'bg-blue-500' : 'bg-slate-700'} overflow-hidden shadow-lg border border-white/5`}>
                        {activeChat.type === 'saved' ? <i className="fa-solid fa-bookmark text-white"></i> : <img src={participant?.avatarUrl} className="w-full h-full object-cover" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h2 className="font-bold text-[15px] md:text-[16px] leading-tight text-white flex items-center min-w-0">
                          <span className="truncate">{activeChat.type === 'saved' ? 'Избранное' : participant?.username}</span>
                          {activeChat.type !== 'saved' && participant?.verified && <VerifiedIcon className="ml-1" />}
                        </h2>
                        {isOtherTyping ? (<div className="flex items-center text-blue-400 text-[11px] font-bold"><span className="typing-dot"></span><span className="typing-dot"></span><span className="typing-dot"></span><span>печатает</span></div>) : (<span className={`text-[11px] block truncate ${participant?.online ? 'text-blue-400 font-bold' : 'text-[#7f91a4]'}`}>{activeChat.type === 'saved' ? 'облако' : formatLastSeen(participant?.online || false, participant?.lastSeen || 0)}</span>)}
                      </div>
                  </div>
                  <div className="flex items-center gap-0 text-[#7f91a4] shrink-0">
                      <button onClick={() => setIsSearching(true)} className="p-2 md:p-3 hover:text-white transition-all active:scale-90" title="Поиск"><i className="fa-solid fa-magnifying-glass"></i></button>
                      <button onClick={() => participant && startCall(participant)} className="p-2 md:p-3 hover:text-white transition-all active:scale-90" title="Позвонить"><i className="fa-solid fa-phone"></i></button>
                      <button onClick={(e) => setContextMenu({ x: e.clientX, y: e.clientY, type: 'header' })} className="p-2 md:p-3 hover:text-white transition-all active:scale-90" title="Меню"><i className="fa-solid fa-ellipsis-vertical"></i></button>
                  </div>
                </>
              )}
            </div>

            {pinnedMessage && !isSearching && (
              <div className="bg-[#17212b]/95 backdrop-blur-md border-b border-[#0e1621] flex items-center gap-3 px-4 py-2 cursor-pointer group hover:bg-white/[0.02] transition-all animate-slide-up z-30 shadow-lg" onClick={() => jumpToMessage(pinnedMessage.id)}>
                <div className="w-[3px] self-stretch bg-blue-500 rounded-full"></div>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-bold text-blue-500 uppercase tracking-wider mb-0.5">Закреплённое сообщение</div>
                  <div className="text-[13px] text-white truncate max-w-full font-medium">{pinnedMessage.text || (pinnedMessage.fileUrl ? 'Медиафайл' : 'Голосовое сообщение')}</div>
                </div>
                <button onClick={(e) => { e.stopPropagation(); togglePinMessage(pinnedMessage.id); }} className="text-[#7f91a4] hover:text-white p-2 transition-all opacity-0 group-hover:opacity-100"><i className="fa-solid fa-xmark text-sm"></i></button>
              </div>
            )}

            <div className="flex-1 relative overflow-hidden flex flex-col">
              {isSearching && (
                <div className="absolute inset-0 z-[35] bg-[#0e1621] flex flex-col animate-fade-in shadow-inner">
                  <div className="p-4 border-b border-white/5 text-[#7f91a4] text-[10px] font-black uppercase tracking-[0.2em]">
                    {chatSearchQuery.trim() ? `Найдено ${getSearchResults().length} совпадений` : 'Поиск по истории переписки'}
                  </div>
                  <div className="flex-1 overflow-y-auto no-scrollbar">
                    {chatSearchQuery.trim() ? getSearchResults().map(msg => (
                        <button key={msg.id} onClick={() => jumpToMessage(msg.id)} className="w-full p-4 flex gap-4 hover:bg-white/[0.03] active:bg-white/5 transition-all text-left border-b border-white/5">
                          <img src={msg.senderId === currentUser.id ? currentUser.avatarUrl : participant?.avatarUrl} className="w-10 h-10 rounded-full object-cover shrink-0 border border-white/5" />
                          <div className="min-w-0 flex-1">
                            <div className="flex justify-between items-center mb-1">
                              <span className="font-bold text-sm text-white truncate">{msg.senderId === currentUser.id ? 'Вы' : participant?.username}</span>
                              <span className="text-[10px] text-[#7f91a4]">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <div className="text-sm text-[#7f91a4] line-clamp-2">{msg.text}</div>
                          </div>
                        </button>
                    )) : (<div className="flex flex-col items-center justify-center h-full text-[#7f91a4] opacity-20"><i className="fa-solid fa-magnifying-glass text-6xl mb-4"></i><p className="text-sm font-bold uppercase tracking-widest">Введите запрос</p></div>)}
                  </div>
                </div>
              )}
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 md:p-4 space-y-1 flex flex-col no-scrollbar">
                <div className="flex-1" />
                {renderMessages()}
              </div>
            </div>

            <MessageInput chatId={activeChatId} currentUserId={currentUser.id} onSend={handleSendMessage} onFileSelect={(file) => setPendingFiles([file])} replyTo={replyMessage ? { senderName: replyMessage.senderId === currentUser.id ? 'Вы' : participant?.username || 'Собеседник', text: replyMessage.text } : null} onCancelReply={() => setReplyMessage(null)} />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-[#7f91a4] animate-fade-in"><div className="bg-[#182533]/80 px-8 py-5 rounded-3xl text-center border border-white/5 shadow-2xl backdrop-blur-md"><i className="fa-solid fa-paper-plane text-4xl mb-4 opacity-10 block"></i><span className="text-sm font-medium tracking-wide">Выберите чат, чтобы начать общение</span></div></div>
        )}
      </div>

      {profileUser && <ProfileModal user={profileUser} currentUser={currentUser} isMe={profileUser.id === currentUser.id} onUpdate={(u) => { updateDoc(doc(db, 'users', u.id), u); setProfileUser(null); }} onClose={() => setProfileUser(null)} />}
      
      {activeCall && <CallOverlay 
        user={activeCall.peer} 
        onClose={endCall} 
        onAccept={acceptCall}
        isIncoming={activeCall.isIncoming}
        status={activeCall.status}
      />}
      
      {contextMenu && (
        <ContextMenu 
          x={contextMenu.x} 
          y={contextMenu.y} 
          onReaction={(emoji) => contextMenu.msg && handleReaction(contextMenu.msg.id, emoji)} 
          items={contextMenu.type === 'msg' ? [
            { label: 'Ответить', icon: 'fa-reply', onClick: () => setReplyMessage(contextMenu.msg!) },
            { label: activeChat?.pinnedMessageId === contextMenu.msg?.id ? 'Открепить' : 'Закрепить', icon: 'fa-thumbtack', onClick: () => contextMenu.msg && togglePinMessage(contextMenu.msg.id) },
            { label: 'Копировать текст', icon: 'fa-copy', onClick: () => contextMenu.msg && navigator.clipboard.writeText(contextMenu.msg.text) },
            /* Fix: Pass activeChatId as the first argument to deleteSingleMessage. */
            { label: 'Удалить', icon: 'fa-trash-can', onClick: () => contextMenu.msg && activeChatId && deleteSingleMessage(activeChatId, contextMenu.msg.id), danger: true }
          ] : [
            { label: isMuted ? 'Включить уведомления' : 'Выключить уведомления', icon: isMuted ? 'fa-bell' : 'fa-bell-slash', onClick: () => setIsMuted(!isMuted) },
            { label: 'Поиск в чате', icon: 'fa-magnifying-glass', onClick: () => setIsSearching(true) },
            { label: 'Очистить историю', icon: 'fa-broom', onClick: () => { /* Logic already in Messenger */ } },
            { label: 'Удалить чат', icon: 'fa-trash', onClick: () => { /* Logic already in Messenger */ }, danger: true }
          ]} 
          onClose={() => setContextMenu(null)} 
        />
      )}
      
      {viewingImageUrl && <FullImageViewer src={viewingImageUrl} onClose={() => setViewingImageUrl(null)} />}
      {pendingFiles.length > 0 && <MediaSendModal initialFiles={pendingFiles} onClose={() => setPendingFiles([])} onSend={(caption, files) => { files.forEach(file => handleSendMessage(caption, file)); setPendingFiles([]); }} />}
    </div>
  );
};

const deleteSingleMessage = async (chatId: string, msgId: string) => {
    await deleteDoc(doc(db, `chats/${chatId}/messages`, msgId));
};

export default Messenger;
