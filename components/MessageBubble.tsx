
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Message } from '../types';

interface MessageBubbleProps {
  message: Message;
  isMe: boolean;
  onContextMenu: (e: React.MouseEvent, msg: Message) => void;
  onReaction: (emoji: string) => void;
  onImageClick?: (url: string) => void;
  currentUserId: string;
  currentUserAvatar?: string;
  participantAvatar?: string;
  senderName?: string;
  chatType?: string;
  onMentionClick?: (handle: string) => void;
  onPhoneClick?: (phone: string) => void;
  onInviteClick?: (link: string) => void;
}

const VoicePlayer: React.FC<{ url: string, isMe: boolean }> = ({ url, isMe }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const onTimeUpdate = () => {
    if (audioRef.current) {
      const current = audioRef.current.currentTime;
      const total = audioRef.current.duration;
      setProgress((current / total) * 100);
    }
  };

  const onLoadedMetadata = () => {
    if (audioRef.current) setDuration(audioRef.current.duration);
  };

  const onEnded = () => {
    setIsPlaying(false);
    setProgress(0);
  };

  const formatDuration = (d: number) => {
    const min = Math.floor(d / 60);
    const sec = Math.floor(d % 60);
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-3 py-1 min-w-[160px] sm:min-w-[200px]">
      <audio 
        ref={audioRef} 
        src={url} 
        onTimeUpdate={onTimeUpdate} 
        onLoadedMetadata={onLoadedMetadata}
        onEnded={onEnded}
      />
      <button 
        onClick={togglePlay} 
        className={`w-9 h-9 rounded-full flex items-center justify-center transition-all shrink-0 shadow-sm
          ${isMe ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'}`}
      >
        <i className={`fa-solid ${isPlaying ? 'fa-pause' : 'fa-play'} ${!isPlaying ? 'ml-0.5' : ''}`}></i>
      </button>
      
      <div className="flex-1 flex flex-col gap-1.5">
        <div className="relative h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
          <div 
            className={`absolute top-0 left-0 h-full transition-all duration-100 ${isMe ? 'bg-white/60' : 'bg-blue-400'}`} 
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between items-center px-0.5">
          <span className="text-[10px] font-bold text-white/50">{formatDuration(audioRef.current?.currentTime || 0)}</span>
          <span className="text-[10px] font-bold text-white/50">{formatDuration(duration)}</span>
        </div>
      </div>
    </div>
  );
};

const StatusIcon = ({ status, className = "" }: { status?: string, className?: string }) => {
  if (status === 'read') {
    return (
      <svg width="18" height="12" viewBox="0 0 18 12" fill="none" className={className}>
        <path d="M1 6.5L5 10.5L13.5 1.5" stroke="#40d398" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M5 6.5L9 10.5L17.5 1.5" stroke="#40d398" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    );
  }
  return (
    <svg width="13" height="12" viewBox="0 0 13 12" fill="none" className={className}>
      <path d="M1 6.5L5 10.5L12 1.5" stroke="rgba(255,255,255,0.4)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
};

const MessageBubble: React.FC<MessageBubbleProps> = ({ 
  message, 
  isMe, 
  onContextMenu, 
  onReaction, 
  currentUserId,
  onMentionClick,
  onPhoneClick,
  onInviteClick,
  participantAvatar,
  senderName,
  chatType
}) => {
  const formatTime = (ts: number) => {
    try {
      return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };
  
  const reactionsEntries = Object.entries(message.reactions || {}).filter(([_, users]) => users.length > 0);
  const hasReactions = reactionsEntries.length > 0;

  const parsedContent = useMemo(() => {
    const text = message.text || '';
    if (!text) return null;
    
    // Improved regex to handle various domain and protocol variations
    const parts = text.split(/(@[a-zA-Z0-9_]+|\+888\s?\d{4}\s?\d{4}|(?:https?:\/\/)?(?:mgn\.me|mgn\.zw)\/\+[a-zA-Z0-9]+)/g);
    
    return parts.map((part, i) => {
      if (!part) return null;
      if (part.startsWith('@')) {
        return (
          <span 
            key={i} 
            onClick={(e) => { e.stopPropagation(); onMentionClick?.(part); }}
            className="text-blue-400 font-bold hover:underline cursor-pointer"
          >
            {part}
          </span>
        );
      }
      if (part.startsWith('+888')) {
        return (
          <span 
            key={i} 
            onClick={(e) => { e.stopPropagation(); onPhoneClick?.(part); }}
            className="text-blue-400 font-bold hover:underline cursor-pointer"
          >
            {part}
          </span>
        );
      }
      if (part.includes('mgn.me/+') || part.includes('mgn.zw/+')) {
        return (
          <span 
            key={i} 
            onClick={(e) => { e.stopPropagation(); onInviteClick?.(part); }}
            className="text-blue-400 font-bold hover:underline cursor-pointer"
          >
            {part}
          </span>
        );
      }
      return part;
    });
  }, [message.text, onMentionClick, onPhoneClick, onInviteClick]);

  const showParticipantInfo = chatType === 'group' && !isMe;

  return (
    <div className={`flex w-full select-none mb-1 gap-2 items-end ${isMe ? 'justify-end' : 'justify-start'}`}>
      {showParticipantInfo && (
        <div className="shrink-0 mb-0.5">
          <img 
            src={participantAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(senderName || 'U')}&background=3390ec&color=fff`} 
            className="w-8 h-8 rounded-full object-cover border border-white/10" 
            alt="avatar"
          />
        </div>
      )}
      <div className={`flex flex-col max-w-[85%] sm:max-w-[75%] ${isMe ? 'items-end' : 'items-start'} animate-fade-in`}>
        <div 
          onContextMenu={(e) => {
            e.preventDefault();
            onContextMenu(e, message);
          }}
          className={`relative px-3 py-2 rounded-2xl shadow-sm transition-all cursor-pointer group z-10
            ${isMe ? 'bg-[#2b5278] rounded-br-none text-white' : 'bg-[#182533] rounded-bl-none text-white'}
            active:scale-[0.98]
          `}
        >
          {showParticipantInfo && (
            <div className="text-[12px] font-bold text-blue-400 mb-0.5 truncate max-w-[150px]">
              {senderName || 'Участник'}
            </div>
          )}

          {message.replyPreview && (
            <div className="mb-2 bg-black/20 p-2 rounded-xl border-l-4 border-[#2481cc] cursor-pointer hover:bg-black/30 transition-all overflow-hidden max-w-full">
              <div className="text-[10px] font-black text-[#2481cc] uppercase truncate">{message.replyPreview.senderName}</div>
              <div className="text-[12px] text-white/50 truncate">{message.replyPreview.text}</div>
            </div>
          )}

          <div className={`flex flex-col leading-[1.4] whitespace-pre-wrap break-all pr-14 relative min-w-[70px]`}>
            {message.audioUrl ? (
              <VoicePlayer url={message.audioUrl} isMe={isMe} />
            ) : (
              <span className="text-[15px] select-text">{parsedContent}</span>
            )}
            
            <div className="absolute right-[-4px] bottom-[-2px] flex items-center gap-1 pl-2 pb-1 pointer-events-none">
              <span className="text-[10px] font-medium text-white/40 select-none">
                {formatTime(message.timestamp)}
              </span>
              {isMe && <StatusIcon status={message.status} className="w-[14px] h-[10px]" />}
            </div>
          </div>
        </div>

        {hasReactions && (
          <div className={`flex flex-wrap gap-1 mt-[-7px] mb-2 z-20 ${isMe ? 'justify-end mr-1' : 'justify-start ml-1'} animate-fade-in`}>
            {reactionsEntries.map(([emoji, users]) => {
              const iReacted = users.includes(currentUserId);
              const count = users.length;
              
              return (
                <button 
                  key={emoji} 
                  onClick={(e) => { e.stopPropagation(); onReaction(emoji); }} 
                  className={`flex items-center gap-0.5 px-1.5 py-[0.5px] rounded-full border transition-all active:scale-90 shadow-[0_1px_3px_rgba(0,0,0,0.4)]
                    ${iReacted 
                      ? 'bg-[#3390ec] border-[#4dabff] text-white' 
                      : 'bg-[#1c2a38] border-white/5 text-white/90'}
                  `}
                >
                  <span className="text-base leading-none select-none">{emoji}</span>
                  {count > 1 && (
                    <span className="text-[10px] font-black text-white pr-0.5 leading-none">{count}</span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageBubble;
