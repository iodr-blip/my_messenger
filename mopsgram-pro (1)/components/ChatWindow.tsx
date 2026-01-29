
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
  onReaction: (msgId: string, emoji: string) => void;
  replyMessage: Message | null;
  onCancelReply: () => void;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ 
  chat, messages, onSendMessage, onBack, currentUser, onProfileOpen, onMessageAction, onReaction,
  replyMessage, onCancelReply
}) => {
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
    <div className="flex flex-col h-full w-full bg-[#0e1621] relative overflow-hidden transition-all animate-fade-in">
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
        <div className="fixed inset-0 z-[200] bg-[#0e1621] flex flex-col items-center justify-between py-20 animate-fade-in backdrop-blur-3xl">
          <div className="text-center">
            <div className="relative mb-8">
              <div className="absolute inset-0 bg-[#2481cc] rounded-full animate-ping opacity-10 scale-150"></div>
              <img src={participant?.avatarUrl} className="w-40 h-40 rounded-[35%] border-4 border-[#2481cc]/20 relative z-10 mx-auto shadow-2xl" alt="call" />
            </div>
            <h2 className="text-3xl font-black mb-2 tracking-tight">{participant?.username}</h2>
            <div className="flex items-center justify-center gap-2">
               <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
               <p className="text-[#2481cc] font-black tracking-widest text-lg">{formatCallTime(callTimer)}</p>
            </div>
          </div>
          
          <div className="flex gap-8 items-center">
            <button className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-all active:scale-90">
              <i className="fa-solid fa-microphone-slash text-xl"></i>
            </button>
            <button 
              onClick={() => setIsCalling(false)}
              className="w-20 h-20 bg-[#ef5350] rounded-full flex items-center justify-center text-white shadow-xl shadow-[#ef5350]/20 active:scale-90 transition-all"
            >
              <i className="fa-solid fa-phone-slash text-2xl"></i>
            </button>
            <button className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-all active:scale-90">
              <i className="fa-solid fa-volume-high text-xl"></i>
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="h-16 bg-[#17212b]/95 backdrop-blur-xl border-b border-[#0e1621] flex items-center px-4 gap-3 z-50">
        <button onClick={onBack} className="md:hidden text-[#7f91a4] p-2 -ml-2 hover:text-white transition-colors active:scale-90">
          <i className="fa-solid fa-arrow-left text-xl"></i>
        </button>
        
        <div 
          className="flex-1 flex items-center gap-3 overflow-hidden cursor-pointer active:opacity-70 transition-all py-1 px-1 rounded-xl"
          onClick={() => !isSaved && participant && onProfileOpen?.(participant)}
        >
          <img src={isSaved ? 'https://cdn-icons-png.flaticon.com/512/566/566412.png' : participant?.avatarUrl} className="w-11 h-11 rounded-[30%] object-cover border border-white/5 shadow-md" alt="avatar" />
          <div className="truncate flex-1">
            <h2 className="font-bold text-[16px] text-white truncate leading-tight">{isSaved ? 'Избранное' : participant?.username}</h2>
            <span className={`text-[11px] font-bold ${participant?.online ? 'text-[#2481cc]' : 'text-[#7f91a4]'}`}>
              {isSaved ? 'Личное облако' : (participant?.online ? 'в сети' : 'был(а) недавно')}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {!isBot && !isSaved && (
            <button onClick={() => setIsCalling(true)} className="text-[#7f91a4] hover:text-[#2481cc] p-3 transition-colors active:scale-90">
              <i className="fa-solid fa-phone text-lg"></i>
            </button>
          )}
          <button className="text-[#7f91a4] hover:text-white p-3 transition-colors active:scale-90">
            <i className="fa-solid fa-ellipsis-vertical text-lg"></i>
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 chat-bg space-y-1.5 flex flex-col no-scrollbar">
        <div className="flex-1" />
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 opacity-20 animate-fade-in">
            <i className="fa-solid fa-message text-7xl mb-6"></i>
            <p className="font-bold uppercase tracking-widest text-xs">Нет сообщений</p>
          </div>
        )}
        {messages.map((msg, idx) => (
          <React.Fragment key={msg.id}>
            {isNewDay(msg, messages[idx-1]) && (
              <div className="flex justify-center my-6 animate-fade-in">
                <span className="bg-[#182533]/90 backdrop-blur-md px-4 py-1 rounded-full text-[11px] font-black text-white/70 shadow-xl border border-white/5 tracking-wider uppercase">
                  {new Date(msg.timestamp).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
                </span>
              </div>
            )}
            <MessageBubble 
              message={msg} 
              isMe={msg.senderId === currentUser.id} 
              onContextMenu={handleMsgContextMenu}
              onReaction={(emoji) => onReaction(msg.id, emoji)}
              currentUserId={currentUser.id}
            />
          </React.Fragment>
        ))}
      </div>

      {/* Reply Preview */}
      {replyMessage && (
        <div className="bg-[#17212b] border-t border-[#0e1621] p-3 flex items-center gap-3 animate-slide-up">
           <div className="w-1 bg-[#2481cc] self-stretch rounded-full"></div>
           <div className="flex-1 overflow-hidden">
              <div className="text-[12px] font-black text-[#2481cc] uppercase tracking-wider">Ответ на сообщение</div>
              <div className="text-sm text-[#7f91a4] truncate">{replyMessage.text}</div>
           </div>
           <button onClick={onCancelReply} className="p-2 text-[#7f91a4] hover:text-white transition-colors active:scale-90">
             <i className="fa-solid fa-xmark text-lg"></i>
           </button>
        </div>
      )}

      <MessageInput onSend={onSendMessage} />
    </div>
  );
};

export default ChatWindow;
