
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { User } from '../types';
import { VerifiedIcon } from './Messenger';
import { db } from '../services/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

interface ProfileModalProps {
  user: User;
  currentUser: User;
  isMe: boolean;
  onUpdate?: (updatedUser: User) => void;
  onClose: () => void;
}

type ModalView = 'VIEW' | 'EDIT' | 'SUB_NAME' | 'SUB_HANDLE' | 'SUB_BIO' | 'SUB_PHONE';

const DEFAULT_AVATAR = (name: string) => `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=334155&color=fff`;

// --- Simple Image Viewer Sub-component ---
const FullImageViewer: React.FC<{ src: string, onClose: () => void }> = ({ src, onClose }) => (
  <div 
    className="fixed inset-0 z-[300] bg-black/90 backdrop-blur-md flex flex-col animate-fade-in items-center justify-center p-4 md:p-12"
    onClick={onClose}
  >
    <div className="absolute top-4 right-4 z-10">
      <button onClick={onClose} className="text-white/60 hover:text-white p-3 transition-all bg-white/10 rounded-full backdrop-blur-md">
        <i className="fa-solid fa-xmark text-2xl"></i>
      </button>
    </div>
    <div className="relative max-w-full max-h-full flex items-center justify-center">
      <img 
        src={src} 
        className="max-w-full max-h-[85vh] md:max-h-[80vh] object-contain shadow-[0_0_80px_rgba(0,0,0,0.8)] rounded-2xl md:rounded-3xl animate-slide-up select-none border border-white/5" 
        alt="Full size" 
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  </div>
);

// --- Sub-component for Image Cropping ---
interface ImageCropperProps {
  imageSrc: string;
  onConfirm: (croppedImageBase64: string) => void;
  onCancel: () => void;
}

const ImageCropper: React.FC<ImageCropperProps> = ({ imageSrc, onConfirm, onCancel }) => {
  const [zoom, setZoom] = useState(1);
  const [minZoom, setMinZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (imageRef.current && containerRef.current) {
      const img = imageRef.current;
      const container = containerRef.current;
      const holeSize = Math.min(container.offsetWidth, container.offsetHeight) * 0.8;
      
      const scaleX = holeSize / img.naturalWidth;
      const scaleY = holeSize / img.naturalHeight;
      const initialScale = Math.max(scaleX, scaleY);
      
      setMinZoom(initialScale);
      setZoom(initialScale);
    }
  }, [imageSrc]);

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setDragStart({ x: clientX - offset.x, y: clientY - offset.y });
  };

  const handleMouseMove = useCallback((e: any) => {
    if (!isDragging) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setOffset({ x: clientX - dragStart.x, y: clientY - dragStart.y });
  }, [isDragging, dragStart]);

  const handleMouseUp = () => setIsDragging(false);

  const handleSave = () => {
    if (!imageRef.current || !containerRef.current) return;
    const canvas = document.createElement('canvas');
    const size = 640;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, size, size);
      const img = imageRef.current;
      const container = containerRef.current;
      const holeSize = Math.min(container.offsetWidth, container.offsetHeight) * 0.8;
      const drawScale = size / holeSize;
      const finalScale = zoom * drawScale;
      const drawW = img.naturalWidth * finalScale;
      const drawH = img.naturalHeight * finalScale;
      const drawX = (size / 2) + (offset.x * drawScale);
      const drawY = (size / 2) + (offset.y * drawScale);
      ctx.save();
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(img, drawX - (drawW / 2), drawY - (drawH / 2), drawW, drawH);
      ctx.restore();
      onConfirm(canvas.toDataURL('image/jpeg', 0.92));
    }
  };

  return (
    <div className="absolute inset-0 z-[200] bg-black flex flex-col animate-fade-in select-none">
      <div className="p-5 flex justify-center items-center bg-black/40 backdrop-blur-md shrink-0">
        <span className="text-white text-[16px] font-bold tracking-tight">Фото профиля</span>
      </div>
      <div ref={containerRef} className="flex-1 relative overflow-hidden cursor-move touch-none flex items-center justify-center bg-[#000]" onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} onTouchStart={handleMouseDown} onTouchMove={handleMouseMove} onTouchEnd={handleMouseUp}>
        <img ref={imageRef} src={imageSrc} draggable={false} className="absolute pointer-events-none origin-center" style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`, maxWidth: 'none' }} alt="Avatar target" />
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="w-full h-full shadow-[0_0_0_9999px_rgba(0,0,0,0.7)]"></div>
          <div className="absolute w-[80%] aspect-square border-2 border-white/20 rounded-full"></div>
        </div>
      </div>
      <div className="p-6 pb-[max(env(safe-area-inset-bottom),24px)] bg-[#17212b] space-y-8 rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
        <div className="flex items-center gap-5">
          <i className="fa-solid fa-minus text-[#7f91a4] text-xs"></i>
          <input type="range" min={minZoom * 0.5} max={minZoom * 5} step="0.001" value={zoom} onChange={(e) => setZoom(parseFloat(e.target.value))} className="flex-1 accent-blue-500 h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer" />
          <i className="fa-solid fa-plus text-[#7f91a4] text-xs"></i>
        </div>
        <div className="flex items-center justify-between">
          <button onClick={onCancel} className="text-[#7f91a4] font-bold text-[14px] uppercase tracking-wider hover:text-white transition-all px-2">Отмена</button>
          <button onClick={handleSave} className="text-blue-400 font-bold text-[14px] uppercase tracking-widest hover:brightness-125 transition-all bg-blue-400/10 px-6 py-2.5 rounded-xl border border-blue-400/20">Установить фото</button>
        </div>
      </div>
    </div>
  );
};

export const formatPhoneDisplay = (phone?: string) => {
  if (!phone || phone.replace(/\s/g, '') === '+888') return 'Неизвестно';
  const digits = phone.replace(/\D/g, ''); 
  const suffix = digits.slice(3, 11);
  if (suffix.length === 0) return 'Неизвестно';
  
  let res = '+888';
  if (suffix.length > 0) res += ` ${suffix.slice(0, 4)}`;
  if (suffix.length > 4) res += ` ${suffix.slice(4, 8)}`;
  return res;
};

const FloatingInput = ({ label, value, onChange, placeholder = "", autoFocus = false, maxLength = 100, type = "text", error = false }: any) => {
  const [isFocused, setIsFocused] = useState(false);
  const isActive = isFocused || (value && value.length > 0);
  return (
    <div className="relative pt-5 pb-1">
      <input
        type={type} autoFocus={autoFocus} maxLength={maxLength}
        className={`w-full bg-transparent border-b outline-none text-white py-1.5 transition-all font-medium ${error ? 'border-red-500' : 'border-white/10 focus:border-blue-500'}`}
        value={value} onFocus={() => setIsFocused(true)} onBlur={() => setIsFocused(false)} onChange={onChange}
      />
      <label className={`absolute left-0 transition-all pointer-events-none uppercase font-bold tracking-tight ${isActive ? `top-0 ${error ? 'text-red-500' : 'text-blue-500'} text-[10px]` : 'top-6 text-[#7f91a4] text-[15px] font-normal'}`}>{isActive ? label : (placeholder || label)}</label>
    </div>
  );
};

const ProfileModal: React.FC<ProfileModalProps> = ({ user, currentUser, isMe, onUpdate, onClose }) => {
  const [view, setView] = useState<ModalView>('VIEW');
  const [tempData, setTempData] = useState<User>({ ...user });
  const [cropperSrc, setCropperSrc] = useState<string | null>(null);
  const [showFullAvatar, setShowFullAvatar] = useState(false);
  const [subLoading, setSubLoading] = useState(false);
  const [subError, setSubError] = useState<string | null>(null);
  const bioRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setTempData({ ...user }); }, [user]);

  useEffect(() => {
    if (view === 'SUB_BIO' && bioRef.current) {
      bioRef.current.style.height = 'auto';
      bioRef.current.style.height = `${bioRef.current.scrollHeight}px`;
    }
  }, [view, tempData.bio]);

  const handleSaveSub = async () => {
    setSubError(null);
    let finalData = { ...tempData };

    if (view === 'SUB_PHONE') {
      const normalized = finalData.phoneNumber?.replace(/\s/g, '');
      if (normalized === '+888') {
        finalData.phoneNumber = "";
      } else {
        setSubLoading(true);
        try {
          const q = query(collection(db, 'users'), where('phoneNumber', '==', normalized));
          const snap = await getDocs(q);
          const existing = snap.docs.find(d => d.id !== user.id);
          if (existing) {
            setSubError('Этот номер уже занят другим пользователем');
            setSubLoading(false);
            return;
          }
          finalData.phoneNumber = normalized;
        } catch (e) {
          setSubError('Ошибка проверки номера');
          setSubLoading(false);
          return;
        }
      }
    }

    if (view === 'SUB_NAME') {
      let { username, surname } = finalData;
      if (!username.trim() && surname?.trim()) { username = surname.trim(); surname = ""; }
      if (!username.trim()) return;
      finalData.username = username.trim();
      finalData.surname = surname?.trim();
    }

    if (onUpdate) onUpdate(finalData);
    setSubLoading(false);
    setView('EDIT');
  };

  const handleBack = () => {
    if (view === 'EDIT') setView('VIEW');
    else setView('EDIT');
    setTempData({ ...user });
    setSubError(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setCropperSrc(ev.target?.result as string);
      reader.readAsDataURL(file);
      e.target.value = '';
    }
  };

  const handleCroppedSave = (base64: string) => {
    const updated = { ...tempData, avatarUrl: base64 };
    setTempData(updated);
    if (onUpdate) onUpdate(updated);
    setCropperSrc(null);
  };

  const renderHeader = () => {
    const isMainView = view === 'VIEW';
    return (
      <div className="flex items-center justify-between p-4 border-b border-white/5 bg-[#17212b] shrink-0">
        <div className="flex items-center gap-4">
          {!isMainView && (
            <button onClick={handleBack} className="text-[#7f91a4] hover:text-white p-1 transition-all">
              <i className="fa-solid fa-chevron-left text-lg"></i>
            </button>
          )}
          <h2 className="text-[17px] font-bold">{isMainView ? 'Информация' : 'Редактировать'}</h2>
        </div>
        <div className="flex items-center gap-1">
          {isMainView && isMe && (
            <button onClick={() => setView('EDIT')} className="text-[#7f91a4] hover:text-white p-2 transition-all">
              <i className="fa-solid fa-pen-to-square text-lg"></i>
            </button>
          )}
          <button onClick={onClose} className="text-[#7f91a4] hover:text-white p-2 transition-all">
            <i className="fa-solid fa-xmark text-xl"></i>
          </button>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    if (view === 'VIEW') {
      return (
        <div className="flex flex-col bg-[#0e1621] h-full overflow-y-auto no-scrollbar animate-fade-in">
          <div className="flex flex-col items-center p-6 bg-[#17212b] border-b border-white/5 shrink-0">
            <div className="relative group cursor-pointer" onClick={() => setShowFullAvatar(true)}>
              <img src={user.avatarUrl} className="w-24 h-24 rounded-full object-cover mb-3 shadow-2xl border-2 border-white/10 active:scale-95 transition-all" alt="avatar" />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 rounded-full mb-3"><i className="fa-solid fa-eye text-white text-xs"></i></div>
              {user.online && <div className="absolute bottom-4 right-0 w-4 h-4 bg-green-500 border-2 border-[#17212b] rounded-full"></div>}
            </div>
            <h3 className="text-xl font-semibold truncate max-w-full px-4 text-white flex items-center gap-1.5">{user.username} {user.surname || ''} {user.verified && <VerifiedIcon />}</h3>
            <span className={`text-xs font-medium ${user.online ? 'text-blue-400' : 'text-[#7f91a4]'}`}>
              {user.online ? 'в сети' : 'был(а) недавно'}
            </span>
          </div>
          <div className="p-4 space-y-1">
            <div className="flex gap-5 items-start p-3 hover:bg-white/5 rounded-xl transition-all group">
              <i className="fa-solid fa-circle-info text-[#7f91a4] mt-1 text-lg w-5 text-center group-hover:text-blue-400"></i>
              <div className="flex-1">
                <div className="text-white text-[15px] whitespace-pre-wrap break-words leading-tight">{user.bio || 'Пользуюсь MeganNait 💎'}</div>
                <div className="text-[#7f91a4] text-xs font-medium mt-0.5">О себе</div>
              </div>
            </div>
            <div className="flex gap-5 items-start p-3 hover:bg-white/5 rounded-xl transition-all group">
              <i className="fa-solid fa-at text-[#7f91a4] mt-1 text-lg w-5 text-center group-hover:text-blue-400"></i>
              <div className="flex-1">
                <div className="text-blue-400 text-[15px] font-bold">{user.username_handle}</div>
                <div className="text-[#7f91a4] text-xs font-medium mt-0.5">Имя пользователя</div>
              </div>
            </div>
            <div className="flex gap-5 items-start p-3 hover:bg-white/5 rounded-xl transition-all group">
              <i className="fa-solid fa-phone text-[#7f91a4] mt-1 text-lg w-5 text-center group-hover:text-blue-400"></i>
              <div className="flex-1">
                <div className="text-white text-[15px] font-medium">{formatPhoneDisplay(user.phoneNumber)}</div>
                <div className="text-[#7f91a4] text-xs font-medium mt-0.5">Телефон</div>
              </div>
            </div>
          </div>
        </div>
      );
    }
    if (view === 'EDIT') {
      return (
        <div className="flex flex-col bg-[#0e1621] h-full overflow-y-auto no-scrollbar animate-fade-in">
          <div className="flex flex-col items-center p-6 bg-[#17212b] relative shrink-0">
            <div className="relative cursor-pointer group" onClick={() => fileInputRef.current?.click()}>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
              <img src={user.avatarUrl} className="w-24 h-24 rounded-full object-cover brightness-75 transition-all group-hover:brightness-50" alt="avatar" />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><i className="fa-solid fa-camera text-white text-xl"></i></div>
            </div>
            <h3 className="text-lg font-semibold mt-2 text-white flex items-center gap-1.5">{user.username} {user.surname || ''} {user.verified && <VerifiedIcon />}</h3>
          </div>
          <div className="flex flex-col bg-[#17212b] mt-4 border-y border-white/5">
            <button onClick={() => setView('SUB_BIO')} className="flex flex-col p-4 hover:bg-white/5 text-left transition-all">
              <div className="flex justify-between items-center w-full"><span className="text-white text-[15px] truncate pr-4">{user.bio || 'О себе'}</span><span className="text-[#7f91a4] text-xs shrink-0 font-bold">{70 - (user.bio?.length || 0)}</span></div>
              <div className="text-[#7f91a4] text-[11px] mt-1 leading-relaxed">Любые подробности, например: возраст, род занятий или город.</div>
            </button>
          </div>
          <div className="flex flex-col bg-[#17212b] mt-4 border-y border-white/5">
            <button onClick={() => setView('SUB_NAME')} className="flex justify-between items-center p-4 hover:bg-white/5 border-b border-white/5 transition-all group">
              <div className="flex items-center gap-4"><i className="fa-solid fa-user text-[#7f91a4] w-5 text-center group-hover:text-white transition-colors"></i><span className="text-[15px] font-medium">Имя</span></div>
              <span className="text-blue-400 text-[15px] font-bold truncate max-w-[150px]">{user.username} {user.surname || ''}</span>
            </button>
            <button onClick={() => setView('SUB_PHONE')} className="flex justify-between items-center p-4 hover:bg-white/5 border-b border-white/5 transition-all group">
              <div className="flex items-center gap-4"><i className="fa-solid fa-phone text-[#7f91a4] w-5 text-center group-hover:text-white transition-colors"></i><span className="text-[15px] font-medium">Виртуальный номер</span></div>
              <span className="text-blue-400 text-[15px] font-bold">{formatPhoneDisplay(user.phoneNumber) === 'Неизвестно' ? 'Добавить' : formatPhoneDisplay(user.phoneNumber)}</span>
            </button>
            <button onClick={() => setView('SUB_HANDLE')} className="flex justify-between items-center p-4 hover:bg-white/5 transition-all group">
              <div className="flex items-center gap-4"><i className="fa-solid fa-at text-[#7f91a4] w-5 text-center group-hover:text-white transition-colors"></i><span className="text-[15px] font-medium">Имя пользователя</span></div>
              <span className="text-blue-400 text-[15px] font-bold">{user.username_handle}</span>
            </button>
          </div>
        </div>
      );
    }
    return null;
  };

  const renderSubModal = () => {
    if (view === 'VIEW' || view === 'EDIT') return null;
    let title = "";
    let content = null;
    let isSaveDisabled = subLoading;

    if (view === 'SUB_NAME') {
      title = "Редактирование имени";
      isSaveDisabled = subLoading || (!tempData.username.trim() && !tempData.surname?.trim());
      content = (<div className="space-y-4"><FloatingInput label="Имя" autoFocus value={tempData.username} onChange={(e: any) => setTempData({ ...tempData, username: e.target.value })} /><FloatingInput label="Фамилия" value={tempData.surname || ''} onChange={(e: any) => setTempData({ ...tempData, surname: e.target.value })} /></div>);
    } else if (view === 'SUB_HANDLE') {
      title = "Имя пользователя";
      isSaveDisabled = subLoading || tempData.username_handle.length < 2;
      content = (<div className="space-y-4"><FloatingInput label="username" autoFocus value={tempData.username_handle.replace('@', '')} onChange={(e: any) => setTempData({ ...tempData, username_handle: `@${e.target.value.toLowerCase()}` })} /><p className="text-[#7f91a4] text-[11px] leading-relaxed italic">Публичное имя для поиска.</p></div>);
    } else if (view === 'SUB_BIO') {
      title = "О себе";
      content = (<div className="space-y-4"><div className="relative pt-5"><textarea ref={bioRef} autoFocus maxLength={70} rows={1} className="w-full bg-transparent border-b border-white/10 outline-none text-white py-1.5 transition-all resize-none focus:border-blue-500 font-medium" value={tempData.bio} onChange={e => setTempData({ ...tempData, bio: e.target.value })} /><label className="absolute top-0 left-0 text-blue-500 text-[10px] font-bold uppercase">О себе</label><span className="absolute right-0 top-0 text-[#7f91a4] text-[10px] font-bold">{70 - tempData.bio.length}</span></div></div>);
    } else if (view === 'SUB_PHONE') {
      title = "Виртуальный номер";
      const displayValue = formatPhoneDisplay(tempData.phoneNumber);
      const currentVal = displayValue === 'Неизвестно' ? '+888' : displayValue;
      isSaveDisabled = subLoading || (currentVal.length > 4 && currentVal.length < 14);
      content = (
        <div className="space-y-4">
          <FloatingInput error={!!subError} label="Номер телефона" autoFocus maxLength={14} value={currentVal} onChange={(e: any) => {
              const val = e.target.value;
              if (val.length < 4) { setTempData({ ...tempData, phoneNumber: '+888' }); return; }
              const digits = val.replace(/\D/g, '');
              const suffix = digits.slice(3, 11);
              let formatted = '+888';
              if (suffix.length > 0) formatted += ` ${suffix.slice(0, 4)}`;
              if (suffix.length > 4) formatted += ` ${suffix.slice(4, 8)}`;
              setTempData({ ...tempData, phoneNumber: formatted });
              setSubError(null);
          }} />
          {subError ? <p className="text-red-400 text-[10px] font-bold animate-fade-in">{subError}</p> : <p className="text-[#7f91a4] text-[11px] italic">Префикс +888 обязателен.</p>}
        </div>
      );
    }

    return (
      <div className="absolute inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in px-4">
        <div className="bg-[#1c2a38] w-full max-w-[300px] rounded-2xl shadow-2xl p-6 flex flex-col gap-4 animate-slide-up border border-white/5">
           <h4 className="text-white text-[16px] font-bold">{title}</h4>
           <div className="py-2">{content}</div>
           <div className="flex justify-end gap-6 mt-4">
              <button disabled={subLoading} onClick={() => { setTempData({ ...user }); setView('EDIT'); setSubError(null); }} className="text-red-400 font-bold text-[13px] uppercase tracking-widest hover:brightness-125 transition-all disabled:opacity-50">Отмена</button>
              <button disabled={isSaveDisabled} onClick={handleSaveSub} className={`font-bold text-[13px] uppercase tracking-widest transition-all ${isSaveDisabled ? 'text-[#7f91a4] opacity-50 cursor-not-allowed' : 'text-blue-400 hover:brightness-125'}`}>{subLoading ? <i className="fas fa-spinner fa-spin"></i> : 'Сохранить'}</button>
           </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center sm:p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md animate-fade-in" onClick={onClose} />
      <div className="relative w-full sm:max-w-[360px] h-full sm:h-[560px] bg-[#17212b] sm:rounded-3xl shadow-2xl overflow-hidden animate-slide-up flex flex-col border border-white/5">
        {!cropperSrc && renderHeader()}
        <div className="flex-1 relative overflow-hidden flex flex-col">
          {renderContent()}
          {renderSubModal()}
          {cropperSrc && <ImageCropper imageSrc={cropperSrc} onCancel={() => setCropperSrc(null)} onConfirm={handleCroppedSave} />}
          {showFullAvatar && <FullImageViewer src={user.avatarUrl} onClose={() => setShowFullAvatar(false)} />}
        </div>
      </div>
    </div>
  );
};

export default ProfileModal;
