
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Message } from '../types';

interface MessageBubbleProps {
  message: Message;
  isMe: boolean;
  onContextMenu: (e: React.MouseEvent, msg: Message) => void;
  onReaction: (emoji: string) => void;
  currentUserId: string;
}

const REACTIONS_LIST = ['👍', '❤️', '🔥', '👏', '😁', '🤔', '😢'];

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isMe, onContextMenu, onReaction, currentUserId }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isRead, setIsRead] = useState(message.status === 'read');
  const [mediaError, setMediaError] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const formatTime = (ts: number) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const formatAudioTime = (s: number) => {
    if (isNaN(s) || !isFinite(s)) return '00:00';
    const mins = Math.floor(s / 60);
    const secs = Math.floor(s % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isImage = (fileName?: string) => {
    if (!fileName) return false;
    return /\.(jpg|jpeg|png|gif|webp)$/i.test(fileName);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    onContextMenu(e, message);
  };

  const togglePlay = () => {
    if (mediaError) return;
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(() => setMediaError(true));
        setIsRead(true);
      }
      setIsPlaying(!isPlaying);
    }
  };

  useEffect(() => {
    if (message.audioUrl) {
      const audio = new Audio(message.audioUrl);
      audioRef.current = audio;
      audio.addEventListener('loadedmetadata', () => setDuration(audio.duration));
      audio.addEventListener('timeupdate', () => setCurrentTime(audio.currentTime));
      audio.addEventListener('ended', () => { setIsPlaying(false); setCurrentTime(0); });
      audio.addEventListener('error', () => setMediaError(true));
      return () => { audio.pause(); audio.src = ''; };
    }
  }, [message.audioUrl]);

  const waveformBars = useMemo(() => {
    const seed = parseInt(message.id.slice(-5), 36) || 123;
    let currentSeed = seed;
    return Array.from({ length: 30 }).map((_, i) => {
      currentSeed = (currentSeed * 16807) % 2147483647;
      const h = (currentSeed % 14) + 6;
      const progress = (currentTime / (duration || 1)) > (i / 30);
      return (
        <div key={i} className={`w-[2px] rounded-full transition-colors ${progress ? 'bg-[#ef5350]' : 'bg-white/20'}`} style={{ height: `${h}px` }} />
      );
    });
  }, [message.id, currentTime, duration]);

  const reactionsData = Object.entries(message.reactions || {}).filter(([_, users]) => users.length > 0);

  return (
    <div className={`flex w-full mb-0.5 ${isMe ? 'justify-end pl-12' : 'justify-start pr-12'} animate-fade-in group`} onContextMenu={handleContextMenu}>
      <div className={`relative max-w-full p-2.5 rounded-2xl shadow-sm transition-all ${isMe ? 'bg-gradient-to-br from-[#2b5278] to-[#1e3a5a] rounded-br-none' : 'bg-[#182533] rounded-bl-none'} ${mediaError ? 'opacity-70' : ''}`}>
        
        {/* Reply Preview in Bubble */}
        {message.replyPreview && (
          <div className="mb-2 bg-black/20 p-2 rounded-xl border-l-4 border-[#2481cc] cursor-pointer hover:bg-black/30 transition-all overflow-hidden max-w-[280px]">
            <div className="text-[11px] font-black text-[#2481cc] uppercase tracking-wider truncate">{message.replyPreview.senderName}</div>
            <div className="text-[12px] text-white/50 truncate">{message.replyPreview.text}</div>
          </div>
        )}

        {message.audioUrl ? (
          <div className="flex items-center gap-3 min-w-[200px] xs:min-w-[240px]">
            <button onClick={togglePlay} className={`w-11 h-11 rounded-full flex items-center justify-center text-white shadow-lg transition-transform active:scale-90 ${mediaError ? 'bg-gray-600' : 'bg-[#ef5350]'}`}>
              <i className={`fa-solid ${mediaError ? 'fa-exclamation' : isPlaying ? 'fa-pause' : 'fa-play'} ${!isPlaying ? 'ml-0.5' : ''}`}></i>
            </button>
            <div className="flex-1 flex flex-col justify-center gap-1">
              <div className="flex items-end gap-[2px] h-6">{waveformBars}</div>
              <div className="flex items-center gap-2 text-[10px] font-bold text-white/40 uppercase tracking-tighter">
                <span>{formatAudioTime(isPlaying ? currentTime : duration)}</span>
                <span>•</span>
                <span>{message.fileSize || '2.4 KB'}</span>
                {!isRead && !isMe && <div className="w-1.5 h-1.5 bg-[#ef5350] rounded-full ml-1"></div>}
              </div>
            </div>
          </div>
        ) : (
          <>
            {message.fileUrl && isImage(message.fileName) && (
              <div className="mb-2 rounded-xl overflow-hidden border border-white/5 shadow-inner">
                <img src={message.fileUrl} alt="msg-img" className="max-w-full max-h-80 object-cover hover:scale-105 transition-transform duration-500" />
              </div>
            )}
            {message.fileUrl && !isImage(message.fileName) && (
              <div className="flex items-center gap-3 bg-black/20 p-3 rounded-xl mb-2 border border-white/5 cursor-pointer hover:bg-black/30 transition-all">
                <div className="w-10 h-10 rounded-xl bg-[#2481cc] flex items-center justify-center text-white shadow-lg"><i className="fa-solid fa-file-arrow-down text-lg"></i></div>
                <div className="flex-1 overflow-hidden">
                  <div className="text-sm font-bold truncate">{message.fileName}</div>
                  <div className="text-[10px] text-[#7f91a4] font-black uppercase">{message.fileSize || 'FILE'}</div>
                </div>
              </div>
            )}
            {message.text && (
              <div className="text-[15px] leading-snug whitespace-pre-wrap break-words px-1 font-medium select-text">
                {message.text}
              </div>
            )}
            <div className="flex items-center justify-end gap-1.5 mt-1 opacity-40 px-1">
              {message.edited && <span className="text-[10px] font-bold uppercase tracking-tighter">ред.</span>}
              <span className="text-[10px] font-bold">{formatTime(message.timestamp)}</span>
              {isMe && <i className={`fa-solid ${message.status === 'read' ? 'fa-check-double text-[#2481cc]' : 'fa-check'} text-[10px]`}></i>}
            </div>
          </>
        )}

        {/* Reactions Display */}
        {reactionsData.length > 0 && (
          <div className={`absolute -bottom-3 ${isMe ? 'right-1' : 'left-1'} flex gap-1 animate-slide-up`}>
            {reactionsData.map(([emoji, users]) => (
              <button 
                key={emoji} 
                onClick={() => onReaction(emoji)}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border border-white/5 transition-all active:scale-90 ${users.includes(currentUserId) ? 'bg-[#2481cc] text-white shadow-lg' : 'bg-[#182533]/80 backdrop-blur-md text-white/70'}`}
              >
                <span>{emoji}</span>
                {users.length > 1 && <span>{users.length}</span>}
              </button>
            ))}
          </div>
        )}

        {/* Reaction Picker Trigger (Telegram-like on hover/click) */}
        <div className={`absolute top-0 ${isMe ? '-left-8' : '-right-8'} opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1`}>
            <button onClick={() => setShowReactionPicker(!showReactionPicker)} className="text-[#7f91a4] hover:text-white transition-colors p-1"><i className="fa-regular fa-face-smile text-lg"></i></button>
        </div>

        {showReactionPicker && (
            <div className={`absolute z-50 -top-12 ${isMe ? 'right-0' : 'left-0'} bg-[#1c2a38]/95 backdrop-blur-xl border border-white/10 p-1.5 rounded-2xl flex gap-1 shadow-2xl animate-fade-in`}>
                {REACTIONS_LIST.map(r => (
                    <button key={r} onClick={() => { onReaction(r); setShowReactionPicker(false); }} className="hover:scale-125 transition-transform p-1 text-xl">{r}</button>
                ))}
            </div>
        )}
      </div>
    </div>
  );
};

export default MessageBubble;
