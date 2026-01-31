
import React, { useState, useEffect, useRef } from 'react';

interface MediaFile {
  id: string;
  file: File;
  preview: string;
  rotation: number;
}

interface MediaSendModalProps {
  initialFiles: File[];
  onClose: () => void;
  onSend: (caption: string, files: File[], rotations: number[]) => void;
}

const MediaSendModal: React.FC<MediaSendModalProps> = ({ initialFiles, onClose, onSend }) => {
  const [mediaList, setMediaList] = useState<MediaFile[]>([]);
  const [caption, setCaption] = useState('');
  const addFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const newMedia = initialFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      preview: URL.createObjectURL(file),
      rotation: 0
    }));
    setMediaList(newMedia);
    return () => newMedia.forEach(m => URL.revokeObjectURL(m.preview));
  }, [initialFiles]);

  const handleRotate = (id: string) => {
    setMediaList(prev => prev.map(m => 
      m.id === id ? { ...m, rotation: (m.rotation + 90) % 360 } : m
    ));
  };

  const handleDelete = (id: string) => {
    setMediaList(prev => {
      const filtered = prev.filter(m => m.id !== id);
      if (filtered.length === 0) onClose();
      return filtered;
    });
  };

  const handleAddMore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    const newMedia = selected.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      preview: URL.createObjectURL(file),
      rotation: 0
    }));
    setMediaList(prev => [...prev, ...newMedia]);
  };

  const handleSend = () => {
    const files = mediaList.map(m => m.file);
    const rotations = mediaList.map(m => m.rotation);
    onSend(caption, files, rotations);
  };

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center p-0 md:p-4 animate-fade-in">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-[#1c2a38] w-full max-w-[440px] md:rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-slide-up border border-white/5 h-full md:h-auto max-h-screen">
        {/* Header */}
        <div className="p-4 flex items-center justify-between border-b border-white/5 shrink-0">
          <h3 className="text-white font-bold text-[15px]">
            {mediaList.length > 1 ? `Выбрано ${mediaList.length} медиа` : (mediaList[0]?.file.type.startsWith('video/') ? 'Отправить видео' : 'Отправить изображение')}
          </h3>
          <button className="text-[#7f91a4] hover:text-white transition-all">
            <i className="fa-solid fa-ellipsis-vertical"></i>
          </button>
        </div>

        {/* Media Preview Area */}
        <div className="flex-1 overflow-y-auto no-scrollbar bg-black/20">
          <div className="flex flex-col">
            {mediaList.map((item) => (
              <div key={item.id} className="relative w-full group overflow-hidden border-b border-white/5 last:border-0">
                <div className="flex items-center justify-center bg-[#0e1621] transition-all" style={{ transform: `rotate(${item.rotation}deg)` }}>
                  {item.file.type.startsWith('video/') ? (
                    <video src={item.preview} className="w-full max-h-[500px] object-contain" controls />
                  ) : (
                    <img src={item.preview} className="w-full max-h-[500px] object-contain" alt="Preview" />
                  )}
                </div>
                
                {/* Overlay Controls */}
                <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  <button 
                    onClick={() => handleRotate(item.id)}
                    className="bg-black/50 backdrop-blur-md p-2.5 rounded-xl text-white hover:bg-blue-500 transition-all border border-white/10"
                  >
                    <i className="fa-solid fa-rotate"></i>
                  </button>
                  <button 
                    onClick={() => handleDelete(item.id)}
                    className="bg-black/50 backdrop-blur-md p-2.5 rounded-xl text-white hover:bg-red-500 transition-all border border-white/10"
                  >
                    <i className="fa-solid fa-trash-can"></i>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Input Area */}
        <div className="p-4 pt-6 space-y-4 shrink-0 bg-[#1c2a38]">
          <div className="relative">
            <input 
              autoFocus
              type="text" 
              placeholder="Подпись" 
              value={caption}
              onChange={e => setCaption(e.target.value)}
              className="w-full bg-transparent border-b border-blue-500/50 outline-none text-white py-2 focus:border-blue-500 transition-all text-[15px] pr-10"
              onKeyDown={e => e.key === 'Enter' && handleSend()}
            />
            <button className="absolute right-0 bottom-2 text-[#7f91a4] hover:text-white transition-all">
              <i className="fa-regular fa-face-smile text-lg"></i>
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-3 flex items-center justify-between border-t border-white/5 bg-[#1c2a38] pb-[max(env(safe-area-inset-bottom),12px)]">
          <input 
            type="file" 
            ref={addFileInputRef} 
            className="hidden" 
            multiple 
            accept="image/*,video/*" 
            onChange={handleAddMore} 
          />
          <button 
            onClick={() => addFileInputRef.current?.click()}
            className="text-blue-400 font-bold text-xs uppercase tracking-widest px-4 py-3 rounded-xl hover:bg-white/5 active:scale-95 transition-all"
          >
            Добавить
          </button>
          <div className="flex gap-2">
            <button 
              onClick={onClose} 
              className="text-[#7f91a4] font-bold text-xs uppercase tracking-widest px-4 py-3 rounded-xl hover:bg-white/5 active:scale-95 transition-all"
            >
              Отмена
            </button>
            <button 
              onClick={handleSend} 
              className="text-blue-400 font-bold text-xs uppercase tracking-widest px-4 py-3 rounded-xl hover:bg-blue-400/10 active:scale-95 transition-all"
            >
              Отправить
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MediaSendModal;
