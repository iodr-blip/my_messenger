
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Message } from '../types';

interface MessageBubbleProps {
  message: Message;
  isMe: boolean;
  onContextMenu: (e: React.MouseEvent, msg: Message) => void;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isMe, onContextMenu }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isRead, setIsRead] = useState(message.status === 'read');
  const [mediaError, setMediaError] = useState(false);
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
    if (mediaError) return alert('Голосовое сообщение больше не доступно (истек срок действия сессии)');
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(err => {
            console.error("Playback failed:", err);
            setMediaError(true);
        });
        setIsRead(true);
      }
      setIsPlaying(!isPlaying);
    }
  };

  useEffect(() => {
    if (message.audioUrl) {
      // Basic check for empty or invalid source
      if (!message.audioUrl || message.audioUrl === 'undefined') {
          setMediaError(true);
          return;
      }

      const audio = new Audio();
      audio.src = message.audioUrl;
      audioRef.current = audio;
      
      const onLoadedMetadata = () => {
          setDuration(audio.duration);
          setMediaError(false);
      };
      const onTimeUpdate = () => setCurrentTime(audio.currentTime);
      const onEnded = () => {
        setIsPlaying(false);
        setCurrentTime(0);
      };
      const onError = () => {
          setMediaError(true);
          setIsPlaying(false);
      };

      audio.addEventListener('loadedmetadata', onLoadedMetadata);
      audio.addEventListener('timeupdate', onTimeUpdate);
      audio.addEventListener('ended', onEnded);
      audio.addEventListener('error', onError);

      // Pre-load check
      audio.load();

      return () => {
        audio.removeEventListener('loadedmetadata', onLoadedMetadata);
        audio.removeEventListener('timeupdate', onTimeUpdate);
        audio.removeEventListener('ended', onEnded);
        audio.removeEventListener('error', onError);
        audio.pause();
        audio.src = ''; // Clean up source
      };
    }
  }, [message.audioUrl]);

  // Stable Waveform
  const waveformHeights = useMemo(() => {
    const seed = parseInt(message.id.slice(-5), 36) || 123;
    let currentSeed = seed;
    return Array.from({ length: 35 }).map(() => {
      currentSeed = (currentSeed * 16807) % 2147483647;
      return (currentSeed % 15) + 5;
    });
  }, [message.id]);

  const waveformBars = waveformHeights.map((h, i) => (
    <div 
      key={i} 
      className={`w-[2px] rounded-full transition-colors duration-200 ${
        mediaError 
            ? 'bg-white/10' 
            : (currentTime / (duration || 1)) > (i / 35) 
                ? 'bg-[#ef5350]' 
                : 'bg-[#5c6e7e]'
      }`}
      style={{ height: `${h}px` }}
    />
  ));

  return (
    <div 
      className={`flex w-full mb-1 ${isMe ? 'justify-end' : 'justify-start'}`}
      onContextMenu={handleContextMenu}
    >
      <div className={`relative max-w-[85%] sm:max-w-[70%] p-2 rounded-2xl shadow-sm group ${isMe ? 'bg-[#2b5278] rounded-br-none' : 'bg-[#182533] rounded-bl-none'} ${mediaError ? 'opacity-70' : ''}`}>
        
        {message.audioUrl ? (
          <div className="flex items-center gap-3 py-1 px-1 min-w-[240px]">
            <button 
                onClick={togglePlay}
                disabled={mediaError}
                className={`w-11 h-11 rounded-full flex items-center justify-center cursor-pointer transition-all text-white shadow-lg ${mediaError ? 'bg-gray-600' : 'bg-[#ef5350] hover:bg-[#ef5350]/90 active:scale-95'}`}
            >
              <i className={`fa-solid ${mediaError ? 'fa-triangle-exclamation' : isPlaying ? 'fa-pause' : 'fa-play'} ${!isPlaying && !mediaError ? 'ml-0.5' : ''} text-lg`}></i>
            </button>
            
            <div className="flex-1 flex flex-col justify-center gap-1">
              <div className="flex items-end gap-[2px] h-6">
                {waveformBars}
              </div>
              <div className="flex items-center gap-2 text-[11px] font-medium text-white/70">
                <span>{mediaError ? 'Недоступно' : formatAudioTime(isPlaying ? currentTime : duration)}</span>
                <span>,</span>
                <span>{message.fileSize || '2.4 KB'}</span>
                {!isRead && !isMe && !mediaError && <div className="w-2 h-2 bg-[#ef5350] rounded-full ml-1"></div>}
              </div>
            </div>
            
            <div className="self-end pb-1 pr-1">
               <div className="flex items-center gap-1 opacity-50">
                <span className="text-[10px] font-medium">{formatTime(message.timestamp)}</span>
                {isMe && <i className={`fa-solid ${message.status === 'read' ? 'fa-check-double text-blue-400' : 'fa-check'} text-[10px]`}></i>}
              </div>
            </div>
          </div>
        ) : (
          <>
            {message.fileUrl && isImage(message.fileName) && (
              <div className="mb-2 rounded-lg overflow-hidden border border-white/5 cursor-pointer hover:opacity-90 transition-opacity">
                <img 
                    src={message.fileUrl} 
                    alt="attachment" 
                    className="max-w-full max-h-80 object-cover" 
                    onError={() => setMediaError(true)}
                />
                {mediaError && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center flex-col gap-2">
                        <i className="fa-solid fa-circle-exclamation text-white/50 text-2xl"></i>
                        <span className="text-[10px] text-white/50 uppercase font-bold">Файл устарел</span>
                    </div>
                )}
              </div>
            )}

            {message.fileUrl && !isImage(message.fileName) && (
              <div className="flex items-center gap-3 bg-black/20 p-3 rounded-xl mb-2 border border-white/5 cursor-pointer hover:bg-black/30 transition-all">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white shadow-lg ${mediaError ? 'bg-gray-600' : 'bg-[#2481cc]'}`}>
                  <i className={`fa-solid ${mediaError ? 'fa-file-circle-exclamation' : 'fa-file-arrow-down'} text-lg`}></i>
                </div>
                <div className="flex-1 overflow-hidden">
                  <div className={`text-sm font-bold truncate ${mediaError ? 'text-white/40' : 'text-white'}`}>{message.fileName}</div>
                  <div className="text-[10px] text-[#7f91a4] uppercase font-bold">{mediaError ? 'EXPIRED' : message.fileSize || 'FILE'}</div>
                </div>
              </div>
            )}

            {message.text && (
              <div className="text-[15px] leading-snug whitespace-pre-wrap break-words px-1">
                {message.text}
              </div>
            )}

            <div className="flex items-center justify-end gap-1 mt-1 opacity-50 px-1">
              {message.edited && <span className="text-[9px] italic">ред.</span>}
              <span className="text-[10px] font-medium">{formatTime(message.timestamp)}</span>
              {isMe && (
                <i className={`fa-solid ${message.status === 'read' ? 'fa-check-double text-blue-400' : 'fa-check'} text-[10px]`}></i>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default MessageBubble;
