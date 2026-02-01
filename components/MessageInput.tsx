
import React, { useState, useRef, useEffect } from 'react';
import { db } from '../services/firebase';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';

interface MessageInputProps {
  chatId: string;
  currentUserId: string;
  onSend: (text: string, audioBlob?: Blob) => void;
  onFileSelect?: (file: File) => void;
  replyTo?: { senderName: string; text: string } | null;
  onCancelReply?: () => void;
}

const MessageInput: React.FC<MessageInputProps> = ({ chatId, currentUserId, onSend, onFileSelect, replyTo, onCancelReply }) => {
  const [text, setText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<any>(null);
  const typingTimerRef = useRef<any>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Effect to clean up typing status when switching chats or unmounting
  useEffect(() => {
    return () => {
      if (chatId && chatId !== 'saved') {
        const typingDoc = doc(db, `chats/${chatId}/typing`, currentUserId);
        deleteDoc(typingDoc).catch(() => {});
      }
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    };
  }, [chatId, currentUserId]);

  const updateTypingStatus = async (isTyping: boolean) => {
    if (!chatId || !currentUserId || chatId === 'saved') return;
    const typingDoc = doc(db, `chats/${chatId}/typing`, currentUserId);
    try {
      if (isTyping) {
        await setDoc(typingDoc, { isTyping: true, timestamp: Date.now() });
      } else {
        await deleteDoc(typingDoc);
      }
    } catch (e) {}
  };

  const handleInputChange = (val: string) => {
    setText(val);
    if (val.length > 0) {
      updateTypingStatus(true);
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => updateTypingStatus(false), 3000);
    } else {
      updateTypingStatus(false);
    }
  };

  const handleSend = () => {
    if (text.trim()) {
      onSend(text.trim());
      setText('');
      updateTypingStatus(false);
      if (textareaRef.current) {
        textareaRef.current.style.height = '44px';
      }
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        if (audioChunksRef.current.length > 0 && !cancelFlag.current) {
          onSend('', audioBlob);
        }
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordTime(0);
      cancelFlag.current = false;
      
      timerRef.current = setInterval(() => {
        setRecordTime(prev => prev + 1000);
      }, 1000);
    } catch (err) {
      console.error("Microphone access denied", err);
    }
  };

  const cancelFlag = useRef(false);

  const stopRecording = (shouldCancel = false) => {
    if (mediaRecorderRef.current && isRecording) {
      cancelFlag.current = shouldCancel;
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea && !isRecording) {
      textarea.style.height = '44px'; 
      const scrollHeight = textarea.scrollHeight;
      if (text.length > 0) {
        textarea.style.height = `${Math.min(scrollHeight, 160)}px`;
      }
    }
  }, [text, isRecording]);

  const formatTime = (ms: number) => {
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-[#17212b] border-t border-[#0e1621] relative z-50 shrink-0 pb-[max(8px,env(safe-area-inset-bottom))]">
      {replyTo && (
        <div className="px-4 py-2 bg-[#0e1621]/50 border-b border-white/5 flex items-center gap-3 animate-slide-up">
           <div className="w-1 bg-blue-500 self-stretch rounded-full"></div>
           <div className="flex-1 overflow-hidden">
              <div className="text-[10px] font-black text-blue-500 uppercase">{replyTo.senderName}</div>
              <div className="text-sm text-[#7f91a4] truncate">{replyTo.text}</div>
           </div>
           <button onClick={onCancelReply} className="text-[#7f91a4] hover:text-white p-2 transition-all"><i className="fa-solid fa-xmark"></i></button>
        </div>
      )}

      <div className="p-2 flex items-end gap-2 max-w-full">
        <input type="file" ref={fileInputRef} className="hidden" accept="image/*,video/*" />
        
        {!isRecording && (
          <button onClick={() => fileInputRef.current?.click()} className="text-[#7f91a4] hover:text-blue-500 p-2.5 mb-0.5 flex-shrink-0 transition-all active:scale-90">
            <i className="fa-solid fa-paperclip text-xl"></i>
          </button>
        )}
        
        <div className={`flex-1 min-w-0 bg-[#0e1621] rounded-[22px] flex flex-col justify-center transition-all border border-white/5 ${isRecording ? 'border-red-500/30' : 'focus-within:border-blue-500/30'}`}>
          {isRecording ? (
            <div className="flex items-center justify-between py-2.5 px-4 animate-fade-in h-[44px]">
              <div className="flex items-center gap-3">
                 <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse"></div>
                 <span className="text-[16px] font-bold text-white font-mono">{formatTime(recordTime)}</span>
              </div>
              <button onClick={() => stopRecording(true)} className="text-red-500 text-[11px] font-black uppercase tracking-widest hover:bg-red-500/10 px-2 py-1 rounded-lg">Отмена</button>
            </div>
          ) : (
            <textarea
                ref={textareaRef} 
                value={text} 
                onChange={(e) => handleInputChange(e.target.value)}
                onBlur={() => updateTypingStatus(false)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Сообщение" 
                rows={1}
                className="w-full bg-transparent border-none focus:outline-none px-4 py-[11px] text-[16px] leading-[22px] resize-none text-white placeholder:text-[#7f91a4] select-text no-scrollbar min-h-[44px] block"
            />
          )}
        </div>

        <button 
          onClick={text.trim() ? handleSend : isRecording ? () => stopRecording(false) : startRecording}
          className={`w-[44px] h-[44px] flex-shrink-0 rounded-full flex items-center justify-center transition-all ${text.trim() || isRecording ? 'bg-blue-600 text-white' : 'bg-white/5 text-[#7f91a4]'} active:scale-90 mb-0.5`}
        >
          <i className={`fa-solid ${text.trim() ? 'fa-paper-plane' : isRecording ? 'fa-check' : 'fa-microphone'} text-[19px] ${isRecording ? 'animate-pulse' : ''}`}></i>
        </button>
      </div>
    </div>
  );
};

export default MessageInput;
