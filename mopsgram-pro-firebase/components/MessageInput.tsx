
import React, { useState, useRef, useEffect } from 'react';

interface MessageInputProps {
  onSend: (text: string, file?: File, isAudio?: boolean) => void;
}

const MessageInput: React.FC<MessageInputProps> = ({ onSend }) => {
  const [text, setText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0); // in ms
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);

  const handleSend = () => {
    if (text.trim()) {
      onSend(text.trim());
      setText('');
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onSend(file.name, file);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Select supported MIME type
      let mimeType = 'audio/webm';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'audio/mp4'; // Safari fallback
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = ''; // Let browser decide
      }

      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const finalMime = mediaRecorder.mimeType || 'audio/webm';
        const extension = finalMime.includes('mp4') ? 'mp4' : 'webm';
        const audioBlob = new Blob(chunksRef.current, { type: finalMime });
        const audioFile = new File([audioBlob], `voice_msg.${extension}`, { type: finalMime });
        onSend("Голосовое сообщение", audioFile, true);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordTime(0);
      const startTime = Date.now();
      timerRef.current = setInterval(() => {
        setRecordTime(Date.now() - startTime);
      }, 100);
    } catch (err) {
      alert("Доступ к микрофону запрещен или не поддерживается");
      console.error(err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.onstop = null; // Prevent sending
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

  const formatTime = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const sec = s % 60;
    const dec = Math.floor((ms % 1000) / 100);
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')},${dec}`;
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [text]);

  return (
    <div className="bg-[#17212b] p-2 flex items-end gap-2 border-t border-[#0e1621] relative z-30">
      <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
      
      {!isRecording && (
        <button 
          onClick={() => fileInputRef.current?.click()}
          className="text-[#7f91a4] hover:text-[#2481cc] p-3 rounded-full transition-colors"
        >
          <i className="fa-solid fa-paperclip text-xl"></i>
        </button>
      )}

      <div className={`flex-1 bg-[#0e1621] rounded-2xl flex items-end px-3 transition-all ${isRecording ? 'overflow-hidden' : ''}`}>
        {isRecording ? (
          <div className="flex-1 flex items-center justify-between py-3 px-1 animate-fade-in">
            <div className="flex items-center gap-2">
               <div className="w-2.5 h-2.5 bg-[#ef5350] rounded-full animate-pulse shadow-[0_0_8px_rgba(239,83,80,0.5)]"></div>
               <span className="text-[15px] font-bold text-white font-mono">{formatTime(recordTime)}</span>
            </div>
            <span className="text-[#7f91a4] text-xs font-medium animate-pulse hidden xs:block">Для отмены отпустите курсор вне поля</span>
            <button 
                onClick={cancelRecording} 
                className="text-[#ef5350] text-[10px] font-bold uppercase tracking-wider hover:bg-red-500/10 px-2 py-1 rounded"
            >
                Отмена
            </button>
          </div>
        ) : (
          <>
            <textarea
                ref={textareaRef} value={text} onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                placeholder="Сообщение" rows={1}
                className="flex-1 bg-transparent border-none focus:outline-none py-3 text-[15px] resize-none max-h-40 text-white"
            />
            <button className="text-[#7f91a4] p-3 hover:text-white transition-colors"><i className="fa-regular fa-face-smile text-xl"></i></button>
          </>
        )}
      </div>

      <button 
        onClick={isRecording ? stopRecording : (text.trim() ? handleSend : startRecording)}
        onMouseDown={(e) => !text.trim() && e.button === 0 && !isRecording && startRecording()}
        className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
            text.trim() 
                ? 'bg-[#2481cc] text-white shadow-lg' 
                : isRecording 
                    ? 'bg-[#ef5350] text-white animate-pulse scale-110 shadow-xl' 
                    : 'text-[#7f91a4] hover:bg-white/5'
        }`}
      >
        <i className={`fa-solid ${text.trim() ? 'fa-paper-plane' : isRecording ? 'fa-stop' : 'fa-microphone'} text-xl`}></i>
      </button>
    </div>
  );
};

export default MessageInput;
