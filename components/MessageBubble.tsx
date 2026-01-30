
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Message } from '../types';

interface MessageBubbleProps {
  message: Message;
  isMe: boolean;
  isSelected?: boolean;
  onContextMenu: (e: React.MouseEvent, msg: Message) => void;
  onReaction: (emoji: string) => void;
  currentUserId: string;
}

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

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isMe, isSelected, onContextMenu, onReaction, currentUserId }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const formatTime = (ts: number) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  const isImage = (fileName?: string, url?: string) => 
    (fileName && /\.(jpg|jpeg|png|gif|webp)$/i.test(fileName)) || 
    (url && url.startsWith('data:image'));

  useEffect(() => {
    if (message.audioUrl) {
      const audio = new Audio(message.audioUrl);
      audioRef.current = audio;
      audio.addEventListener('loadedmetadata', () => setDuration(audio.duration));
      audio.addEventListener('timeupdate', () => setCurrentTime(audio.currentTime));
      audio.addEventListener('ended', () => { setIsPlaying(false); setCurrentTime(0); });
      return () => { audio.pause(); audio.src = ''; };
    }
  }, [message.audioUrl]);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) audioRef.current.pause();
      else audioRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };

  const waveformBars = useMemo(() => {
    const seed = parseInt(message.id.slice(-5), 36) || 123;
    let currentSeed = seed;
    return Array.from({ length: 25 }).map((_, i) => {
      currentSeed = (currentSeed * 16807) % 2147483647;
      const h = (currentSeed % 12) + 4;
      const progress = (currentTime / (duration || 1)) > (i / 25);
      return (
        <div key={i} className={`w-[2px] rounded-full transition-colors ${progress ? 'bg-blue-400' : 'bg-white/20'}`} style={{ height: `${h}px` }} />
      );
    });
  }, [message.id, currentTime, duration]);

  const reactionsData = (Object.entries(message.reactions || {}) as [string, string[]][]).filter(([_, users]) => users.length > 0);

  return (
    <div 
      className={`flex w-full mb-0.5 select-none transition-colors duration-200 ${isMe ? 'justify-end' : 'justify-start'} ${isSelected ? 'bg-blue-500/10' : ''}`}
    >
      <div className={`flex w-full ${isMe ? 'justify-end pl-12' : 'justify-start pr-12'} animate-fade-in`}>
        <div 
          onContextMenu={(e) => {
            e.preventDefault();
            onContextMenu(e, message);
          }}
          className={`relative max-w-full p-2 pb-1 rounded-2xl shadow-sm transition-all cursor-pointer select-text
            ${isMe ? 'bg-[#2b5278] rounded-br-none' : 'bg-[#182533] rounded-bl-none'}
            ${isSelected ? 'ring-2 ring-blue-500/50 scale-[0.98]' : ''}
          `}
        >
          {message.replyPreview && (
            <div className="mb-1.5 bg-black/20 p-2 rounded-xl border-l-3 border-[#2481cc] cursor-pointer hover:bg-black/30 transition-all overflow-hidden max-w-[280px]">
              <div className="text-[10px] font-black text-[#2481cc] uppercase truncate">{message.replyPreview.senderName}</div>
              <div className="text-[12px] text-white/50 truncate">{message.replyPreview.text}</div>
            </div>
          )}

          {message.audioUrl ? (
            <div className="relative min-w-[200px] pt-1">
              <div className="flex items-center gap-3 pr-10">
                <button onClick={togglePlay} className="w-10 h-10 rounded-full flex items-center justify-center bg-blue-500 text-white shadow-lg active:scale-90 transition-all shrink-0">
                  <i className={`fa-solid ${isPlaying ? 'fa-pause' : 'fa-play'} ${!isPlaying ? 'ml-0.5' : ''}`}></i>
                </button>
                <div className="flex-1 flex flex-col justify-center gap-1">
                  <div className="flex items-end gap-[2px] h-4">{waveformBars}</div>
                  <div className="flex items-center gap-2 text-[9px] font-bold text-white/30 uppercase">
                    <span>{isPlaying ? Math.floor(currentTime) : Math.floor(duration)} сек</span>
                    <span>•</span>
                    <span>{message.fileSize || '2.4 KB'}</span>
                  </div>
                </div>
              </div>

              <div className="absolute bottom-0 right-0 flex items-center gap-1 px-1 py-0.5 pointer-events-none">
                <span className="text-[10px] font-medium text-white/30 leading-none">
                  {formatTime(message.timestamp)}
                </span>
                {isMe && <StatusIcon status={message.status} className="w-[14px] h-[10px]" />}
              </div>
            </div>
          ) : (
            <div className="relative">
              {message.fileUrl && isImage(message.fileName, message.fileUrl) && (
                <div className="mb-1 rounded-xl overflow-hidden border border-white/5 bg-black/20">
                  <img src={message.fileUrl} alt="msg" className="max-w-full max-h-80 object-cover pointer-events-none" />
                </div>
              )}
              
              {message.text && (
                <div className="text-[15px] leading-snug whitespace-pre-wrap break-words px-1.5 font-medium pb-1">
                  {message.text}
                  <span className="inline-block w-14 h-1"></span>
                </div>
              )}

              <div className="absolute bottom-0 right-0 flex items-center gap-1 px-1 py-0.5 pointer-events-none">
                {message.edited && (
                  <span className="text-[9px] font-bold uppercase tracking-tighter text-white/20">ред.</span>
                )}
                <span className="text-[10px] font-medium text-white/30 leading-none">
                  {formatTime(message.timestamp)}
                </span>
                {isMe && <StatusIcon status={message.status} className="w-[14px] h-[10px]" />}
              </div>
            </div>
          )}

          {reactionsData.length > 0 && (
            <div className={`absolute -bottom-3 ${isMe ? 'right-1' : 'left-1'} flex gap-1 z-10 animate-fade-in`}>
              {reactionsData.map(([emoji, users]) => (
                <button key={emoji} onClick={(e) => { e.stopPropagation(); onReaction(emoji); }} className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold border border-white/5 ${users.includes(currentUserId) ? 'bg-blue-600 text-white' : 'bg-[#182533]/95 text-white/70'}`}>
                  <span>{emoji}</span>
                  {users.length > 1 && <span className="text-[9px]">{users.length}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
