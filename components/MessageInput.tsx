
import React, { useState, useRef, useEffect } from 'react';
import { db } from '../services/firebase';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';

interface MessageInputProps {
  chatId: string;
  currentUserId: string;
  onSend: (text: string, file?: File, isAudio?: boolean) => void;
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

  const updateTypingStatus = async (isTyping: boolean) => {
    if (!chatId || !currentUserId) return;
    const typingDoc = doc(db, `chats/${chatId}/typing`, currentUserId);
    if (isTyping) {
      await setDoc(typingDoc, { isTyping: true, timestamp: Date.now() });
    } else {
      await deleteDoc(typingDoc);
    }
  };

  const handleInputChange = (val: string) => {
    setText(val);
    updateTypingStatus(val.length > 0);

    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      updateTypingStatus(false);
    }, 3000);
  };

  const handleSend = () => {
    if (text.trim()) {
      onSend(text.trim());
      setText('');
      updateTypingStatus(false);
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        onSend("", new File([audioBlob], "voice.webm", { type: 'audio/webm' }), true);
        stream.getTracks().forEach(track => track.stop());
      };
      mediaRecorder.start();
      setIsRecording(true);
      const startTime = Date.now();
      timerRef.current = setInterval(() => setRecordTime(Date.now() - startTime), 100);
    } catch (err) { alert("Микрофон недоступен: " + err); }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
      setRecordTime(0);
    }
  };

  const formatTime = (ms: number) => {
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [text]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { 
      if (onFileSelect && (file.type.startsWith('image/') || file.type.startsWith('video/'))) {
        onFileSelect(file);
      } else {
        onSend("", file, false);
      }
      e.target.value = ''; 
    }
  };

  return (
    <div className="bg-[#17212b] border-t border-[#0e1621] relative z-50 pb-[max(env(safe-area-inset-bottom),8px)]">
      {replyTo && (
        <div className="px-4 py-2 bg-[#0e1621]/50 border-b border-white/5 flex items-center gap-3 animate-slide-up">
           <div className="w-1 bg-blue-500 self-stretch rounded-full"></div>
           <div className="flex-1 overflow-hidden">
              <div className="text-[10px] font-black text-blue-500 uppercase">{replyTo.senderName}</div>
              <div className="text-sm text-[#7f91a4] truncate">{replyTo.text}</div>
           </div>
           <button onClick={onCancelReply} className="text-[#7f91a4] hover:text-white p-2"><i className="fa-solid fa-xmark"></i></button>
        </div>
      )}

      <div className="p-2 flex items-end gap-1.5 md:gap-2">
        <input type="file" ref={fileInputRef} className="hidden" accept="image/*,video/*" onChange={handleFileChange} />
        {!isRecording && <button onClick={() => fileInputRef.current?.click()} className="text-[#7f91a4] hover:text-blue-500 p-2.5 md:p-3 rounded-full transition-all"><i className="fa-solid fa-paperclip text-lg md:text-xl"></i></button>}
        <div className={`flex-1 bg-[#0e1621] rounded-[22px] flex items-end px-3 transition-all border border-white/5 ${isRecording ? 'border-red-500/30' : ''}`}>
          {isRecording ? (
            <div className="flex-1 flex items-center justify-between py-2 md:py-3 px-1 animate-fade-in">
              <div className="flex items-center gap-2">
                 <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse"></div>
                 <span className="text-[15px] md:text-[16px] font-bold text-white font-mono">{formatTime(recordTime)}</span>
              </div>
              <button onClick={() => { if (mediaRecorderRef.current) mediaRecorderRef.current.stop(); setIsRecording(false); clearInterval(timerRef.current); updateTypingStatus(false); }} className="text-red-500 text-[10px] md:text-[11px] font-black uppercase tracking-widest px-2">Отмена</button>
            </div>
          ) : (
            <textarea
                ref={textareaRef} value={text} onChange={(e) => handleInputChange(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                placeholder="Сообщение" rows={1}
                className="flex-1 bg-transparent border-none focus:outline-none py-2.5 md:py-3 text-[15px] md:text-[16px] resize-none max-h-40 text-white placeholder:text-[#7f91a4]"
            />
          )}
        </div>
        <button 
          onClick={isRecording ? stopRecording : (text.trim() ? handleSend : startRecording)}
          className={`w-11 h-11 md:w-12 md:h-12 flex-shrink-0 rounded-[30%] flex items-center justify-center transition-all ${text.trim() ? 'bg-blue-600 text-white' : isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-white/5 text-[#7f91a4]'} active:scale-90 shadow-lg`}
        ><i className={`fa-solid ${text.trim() ? 'fa-paper-plane' : isRecording ? 'fa-stop' : 'fa-microphone'} text-base md:text-lg`}></i></button>
      </div>
    </div>
  );
};

export default MessageInput;
