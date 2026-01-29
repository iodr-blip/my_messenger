
import React, { useRef, useEffect, useState } from 'react';
import { Chat, Message, User } from '../types';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';
import ContextMenu, { MenuItem } from './ContextMenu';

interface ChatWindowProps {
  chat: Chat;
  messages: Message[];
  onSendMessage: (text: string, file?: File, isAudio?: boolean) => void;
  onBack: () => void;
  currentUser: User;
  onProfileOpen?: (user: User) => void;
  onMessageAction?: (action: string, msg: Message) => void;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ chat, messages, onSendMessage, onBack, currentUser, onProfileOpen, onMessageAction }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isCalling, setIsCalling] = useState(false);
  const [callTimer, setCallTimer] = useState(0);
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, msg: Message } | null>(null);
  
  const isSaved = chat.type === 'saved';
  const isBot = chat.type === 'bot';
  const participant = isSaved ? null : chat.participants[0];

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  useEffect(() => {
    let interval: any;
    if (isCalling) {
      interval = setInterval(() => setCallTimer(prev => prev + 1), 1000);
    } else {
      setCallTimer(0);
    }
    return () => clearInterval(interval);
  }, [isCalling]);

  const handleMsgContextMenu = (e: React.MouseEvent, msg: Message) => {
    setContextMenu({ x: e.clientX, y: e.clientY, msg });
  };

  const getMsgMenuItems = (msg: Message): MenuItem[] => [
    { label: 'Ответить', icon: 'fa-reply', onClick: () => onMessageAction?.('reply', msg) },
    { label: 'Изменить', icon: 'fa-pen', onClick: () => onMessageAction?.('edit', msg) },
    { label: 'Копировать', icon: 'fa-copy', onClick: () => navigator.clipboard.writeText(msg.text) },
    { label: 'Удалить', icon: 'fa-trash-can', onClick: () => onMessageAction?.('delete', msg), danger: true },
  ];

  const formatCallTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isNewDay = (msg: Message, prevMsg?: Message) => {
    if (!prevMsg) return true;
    return new Date(msg.timestamp).toDateString() !== new Date(prevMsg.timestamp).toDateString();
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#0e1621] relative overflow-hidden">
      {contextMenu && (
        <ContextMenu 
          x={contextMenu.x} 
          y={contextMenu.y} 
          items={getMsgMenuItems(contextMenu.msg)} 
          onClose={() => setContextMenu(null)} 
        />
      )}

      {/* Call Overlay */}
      {isCalling && (
        <div className="fixed inset-0 z-[100] bg-[#0e1621]/95 backdrop-blur-xl flex flex-col items-center justify-between py-20 animate-fade-in">
          <div className="text-center">
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-[#2481cc] rounded-full animate-ping opacity-20 scale-150"></div>
              <img src={participant?.avatarUrl} className="w-32 h-32 rounded-full border-4 border-[#2481cc] relative z-10 mx-auto shadow-2xl" alt="call" />
            </div>
            <h2 className="text-3xl font-bold mb-2">{participant?.username}</h2>
            <p className="text-[#2481cc] font-medium tracking-widest">{formatCallTime(callTimer)}</p>
          </div>
          
          <div className="flex gap-8 items-center">
            <button className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-all">
              <i className="fa-solid fa-microphone-slash text-xl"></i>
            </button>
            <button 
              onClick={() => setIsCalling(false)}
              className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center text-white shadow-xl shadow-red-500/20 active:scale-90 transition-all"
            >
              <i className="fa-solid fa-phone-slash text-2xl"></i>
            </button>
            <button className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-all">
              <i className="fa-solid fa-volume-high text-xl"></i>
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="h-14 bg-[#17212b]/95 backdrop-blur-md border-b border-[#0e1621] flex items-center px-4 gap-3 z-20">
        <button onClick={onBack} className="md:hidden text-[#7f91a4] p-2 -ml-2 hover:text-white transition-colors"><i className="fa-solid fa-arrow-left text-xl"></i></button>
        
        <div 
          className="flex-1 flex items-center gap-3 overflow-hidden cursor-pointer active:opacity-70 transition-opacity"
          onClick={() => !isSaved && participant && onProfileOpen?.(participant)}
        >
          <img src={isSaved ? 'https://cdn-icons-png.flaticon.com/512/566/566412.png' : participant?.avatarUrl} className="w-10 h-10 rounded-full object-cover border border-white/5" alt="avatar" />
          <div className="truncate">
            <h2 className="font-bold text-[15px] text-white truncate">{isSaved ? 'Избранное' : participant?.username}</h2>
            <span className={`text-[12px] ${participant?.online ? 'text-[#2481cc]' : 'text-[#7f91a4]'}`}>
              {isSaved ? 'Личное облако' : (participant?.online ? 'в сети' : 'был недавно')}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {!isBot && !isSaved && (
            <button onClick={() => setIsCalling(true)} className="text-[#7f91a4] hover:text-[#2481cc] p-2 transition-colors">
              <i className="fa-solid fa-phone text-lg"></i>
            </button>
          )}
          <button className="text-[#7f91a4] hover:text-white p-2 transition-colors"><i className="fa-solid fa-ellipsis-vertical text-lg"></i></button>
        </div>
      </div>

      {/* Messages Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 chat-bg space-y-1 flex flex-col">
        <div className="flex-1" />
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 opacity-20">
            <i className="fa-solid fa-comment-dots text-6xl mb-4"></i>
            <p>Нет сообщений</p>
          </div>
        )}
        {messages.map((msg, idx) => (
          <React.Fragment key={msg.id}>
            {isNewDay(msg, messages[idx-1]) && (
              <div className="flex justify-center my-4 animate-fade-in">
                <span className="bg-[#182533]/80 backdrop-blur-sm px-3 py-1 rounded-full text-[11px] font-bold text-white/70 shadow-sm border border-white/5 tracking-tight uppercase">
                  {new Date(msg.timestamp).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
                </span>
              </div>
            )}
            <MessageBubble message={msg} isMe={msg.senderId === currentUser.id} onContextMenu={handleMsgContextMenu} />
          </React.Fragment>
        ))}
      </div>

      <MessageInput onSend={onSendMessage} />
    </div>
  );
};

export default ChatWindow;
