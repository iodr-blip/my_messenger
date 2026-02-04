import React, { useState, useRef, useEffect, useMemo } from 'react';
import { db } from '../services/firebase';
import { doc, setDoc, deleteDoc, collection, query, where, getDocs, limit } from 'firebase/firestore';
import { User } from '../types';
import { VerifiedIcon } from './Messenger';

interface MessageInputProps {
  chatId: string;
  currentUserId: string;
  chatParticipants?: User[];
  onSend: (text: string, audioBlob?: Blob) => void;
  onFileSelect?: (file: File) => void;
  replyTo?: { senderName: string; text: string } | null;
  editMessage?: { text: string } | null;
  onCancelReply?: () => void;
}

const MentionList = ({ users, onSelect }: { users: User[], onSelect: (u: User) => void }) => {
  if (users.length === 0) return null;
  return (
    <div className="absolute bottom-full left-0 right-0 mb-1 mx-2 bg-[#17212b] border border-white/5 rounded-2xl shadow-2xl overflow-hidden animate-slide-up z-[60]">
      <div className="max-h-[220px] overflow-y-auto no-scrollbar py-2">
        {users.map(u => (
          <button 
            key={u.id} 
            onClick={() => onSelect(u)}
            className="w-full flex items-center gap-3 px-4 py-2 hover:bg-white/5 transition-all text-left group"
          >
            <img src={u.avatarUrl} className="w-9 h-9 rounded-full object-cover shrink-0 border border-white/10" />
            <div className="flex-1 min-w-0">
              <div className="text-white font-bold text-[14px] truncate flex items-center gap-1.5">
                {u.username} {u.verified && <VerifiedIcon />}
              </div>
              <div className="text-[#7f91a4] text-[11px] font-bold">{u.username_handle}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

const MessageInput: React.FC<MessageInputProps> = ({ chatId, currentUserId, chatParticipants = [], onSend, onFileSelect, replyTo, editMessage, onCancelReply }) => {
  const [text, setText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const [mentionResults, setMentionResults] = useState<User[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<any>(null);
  const typingTimerRef = useRef<any>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    if (editMessage) {
      setText(editMessage.text);
      if (textareaRef.current) textareaRef.current.focus();
    } else {
      setText('');
    }
  }, [editMessage]);

  useEffect(() => {
    const lastWord = text.split(/\s/).pop() || '';
    if (lastWord.startsWith('@')) {
      const search = lastWord.slice(1).toLowerCase();
      
      // First filter current chat participants
      let results = chatParticipants.filter(p => 
        p.id !== currentUserId && 
        (p.username.toLowerCase().includes(search) || p.username_handle.toLowerCase().includes(search))
      );

      // If no results or very short query, try global search (simplified)
      if (results.length === 0 && search.length > 1) {
        const q = query(collection(db, 'users'), where('username_handle', '>=', '@' + search), where('username_handle', '<=', '@' + search + '\uf8ff'), limit(5));
        getDocs(q).then(snap => {
            const global = snap.docs.map(d => ({ id: d.id, ...d.data() } as User)).filter(u => u.id !== currentUserId);
            setMentionResults(global);
        });
      } else {
        setMentionResults(results.slice(0, 5));
      }
    } else {
      setMentionResults([]);
    }
  }, [text, chatParticipants, currentUserId]);

  const handleMentionSelect = (u: User) => {
    const words = text.split(/\s/);
    words.pop();
    const newText = [...words, u.username_handle, ''].join(' ');
    setText(newText);
    setMentionResults([]);
    textareaRef.current?.focus();
  };

  const updateTypingStatus = async (isTyping: boolean) => {
    if (!chatId || !currentUserId || chatId === 'saved' || editMessage) return;
    const typingDoc = doc(db, `chats/${chatId}/typing`, currentUserId);
    try {
      if (isTyping) await setDoc(typingDoc, { isTyping: true, timestamp: Date.now() });
      else await deleteDoc(typingDoc);
    } catch (e) {}
  };

  const handleInputChange = (val: string) => {
    setText(val);
    if (val.length > 0) {
      updateTypingStatus(true);
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => updateTypingStatus(false), 3000);
    } else updateTypingStatus(false);
  };

  const handleSend = () => {
    if (text.trim()) {
      onSend(text.trim());
      setText('');
      updateTypingStatus(false);
      if (textareaRef.current) textareaRef.current.style.height = '44px';
    }
  };

  const startRecording = async () => {
    if (editMessage) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (event) => { if (event.data.size > 0) audioChunksRef.current.push(event.data); };
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        if (audioChunksRef.current.length > 0 && !cancelFlag.current) onSend('', audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };
      mediaRecorder.start();
      setIsRecording(true);
      setRecordTime(0);
      cancelFlag.current = false;
      timerRef.current = setInterval(() => setRecordTime(prev => prev + 1000), 1000);
    } catch (err) { console.error("Microphone access denied", err); }
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
      if (text.length > 0) textarea.style.height = `${Math.min(scrollHeight, 160)}px`;
    }
  }, [text, isRecording]);

  const formatTime = (ms: number) => {
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-[#17212b] border-t border-[#0e1621] relative z-50 shrink-0 pb-[max(8px,env(safe-area-inset-bottom))]">
      <MentionList users={mentionResults} onSelect={handleMentionSelect} />
      
      {replyTo && (
        <div className="px-4 py-2 bg-[#0e1621]/50 border-b border-white/5 flex items-center gap-3 animate-slide-up">
           <div className="w-1 bg-blue-500 self-stretch rounded-full"></div>
           <div className="flex-1 overflow-hidden text-left">
              <div className="text-[10px] font-black text-blue-500 uppercase">{replyTo.senderName}</div>
              <div className="text-sm text-[#7f91a4] truncate">{replyTo.text}</div>
           </div>
           <button onClick={onCancelReply} className="text-[#7f91a4] hover:text-white p-2 transition-all"><i className="fa-solid fa-xmark"></i></button>
        </div>
      )}

      {editMessage && (
        <div className="px-4 py-2 bg-[#0e1621]/50 border-b border-white/5 flex items-center gap-3 animate-slide-up">
           <div className="w-1 bg-blue-500 self-stretch rounded-full"></div>
           <div className="flex-1 overflow-hidden text-left">
              <div className="text-[10px] font-black text-blue-500 uppercase">Редактирование</div>
              <div className="text-sm text-[#7f91a4] truncate">{editMessage.text}</div>
           </div>
           <button onClick={onCancelReply} className="text-[#7f91a4] hover:text-white p-2 transition-all"><i className="fa-solid fa-xmark"></i></button>
        </div>
      )}

      <div className="p-2 flex items-end gap-2 max-w-full">
        <input type="file" ref={fileInputRef} className="hidden" accept="image/*,video/*" />
        
        {!isRecording && !editMessage && (
          <button onClick={() => fileInputRef.current?.click()} className="text-[#7f91a4] hover:text-blue-500 p-2.5 mb-0.5 flex-shrink-0 transition-all active:scale-90">
            <i className="fa-solid fa-paperclip text-xl"></i>
          </button>
        )}

        {editMessage && ( <div className="text-blue-500 p-2.5 mb-0.5 flex-shrink-0"><i className="fa-solid fa-pen text-xl"></i></div> )}
        
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
                ref={textareaRef} value={text} onChange={(e) => handleInputChange(e.target.value)} onBlur={() => updateTypingStatus(false)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder="Сообщение" rows={1}
                className="w-full bg-transparent border-none focus:outline-none px-4 py-[11px] text-[16px] leading-[22px] resize-none text-white placeholder:text-[#7f91a4] select-text no-scrollbar min-h-[44px] block"
            />
          )}
        </div>

        <button onClick={text.trim() ? handleSend : isRecording ? () => stopRecording(false) : editMessage ? undefined : startRecording}
          className={`w-[44px] h-[44px] flex-shrink-0 rounded-full flex items-center justify-center transition-all ${text.trim() || isRecording ? 'bg-blue-600 text-white' : 'bg-white/5 text-[#7f91a4]'} active:scale-90 mb-0.5`}
        >
          <i className={`fa-solid ${ editMessage || isRecording ? 'fa-check' : text.trim() ? 'fa-paper-plane' : 'fa-microphone' } text-[19px] ${isRecording ? 'animate-pulse' : ''}`}></i>
        </button>
      </div>
    </div>
  );
};

export default MessageInput;