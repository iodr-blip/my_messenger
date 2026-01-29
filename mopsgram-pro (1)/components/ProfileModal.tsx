
import React, { useState, useRef } from 'react';
import { User, Message } from '../types';

interface ProfileModalProps {
  user: User;
  isMe: boolean;
  isSettings: boolean;
  userMessages: Message[];
  onUpdate: (user: User) => void;
  onClose: () => void;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ user, isMe, isSettings, userMessages, onUpdate, onClose }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ ...user });
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
    const handleVal = editForm.username_handle.replace('@', '').toLowerCase().trim();
    
    if (editForm.username.trim().length < 1) return alert('Имя не может быть пустым');
    if (editForm.username.length > 82) return alert('Имя слишком длинное (макс 82)');
    
    if (handleVal.length < 5) return alert('Юзернейм слишком короткий (мин 5)');
    if (handleVal.length > 16) return alert('Юзернейм слишком длинный (макс 16)');
    if (!/^[a-z0-9_]+$/.test(handleVal)) return alert('Недопустимые символы в юзернейме');
    
    let updatedForm = { 
      ...editForm, 
      username_handle: handleVal.startsWith('@') ? handleVal : '@' + handleVal 
    };
    
    if (updatedForm.avatarUrl?.includes('ui-avatars.com')) {
      updatedForm.avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(updatedForm.username)}&background=2481cc&color=fff`;
    }

    onUpdate(updatedForm);
    setIsEditing(false);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setEditForm({ ...editForm, avatarUrl: reader.result as string });
      reader.readAsDataURL(file);
    }
  };

  const mediaCounts = {
    photos: userMessages.filter(m => m.fileUrl && /\.(jpg|jpeg|png|gif|webp)$/i.test(m.fileName || '')).length,
    videos: userMessages.filter(m => m.fileUrl && /\.(mp4|mov|webm)$/i.test(m.fileName || '')).length,
    audio: userMessages.filter(m => m.audioUrl).length
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md animate-fade-in" onClick={onClose} />
      
      <div className="relative w-full h-full md:h-auto md:max-w-[420px] bg-[#17212b] md:rounded-3xl shadow-2xl overflow-hidden animate-slide-up flex flex-col max-h-screen md:max-h-[90vh]">
        <div className="flex items-center p-4 bg-[#17212b] border-b border-[#0e1621]">
          <button onClick={onClose} className="text-[#7f91a4] hover:text-white transition-colors p-2">
            <i className="fa-solid fa-arrow-left md:fa-xmark text-xl"></i>
          </button>
          <h2 className="text-xl font-bold ml-4">{isEditing ? 'Настройки' : (isMe ? 'Мой профиль' : 'Профиль')}</h2>
          {isEditing && (
            <button onClick={handleSave} className="ml-auto text-[#2481cc] font-bold p-2 hover:opacity-80">
              <i className="fa-solid fa-check text-xl"></i>
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-8 pb-6 flex flex-col items-center bg-gradient-to-b from-white/5 to-transparent">
            <div className="relative mb-6">
              <img src={isEditing ? editForm.avatarUrl : user.avatarUrl} className="w-32 h-32 rounded-[35%] object-cover border-4 border-[#2481cc]/30 shadow-2xl transition-all duration-500" />
              {isEditing && (
                <button onClick={() => avatarInputRef.current?.click()} className="absolute bottom-0 right-0 w-10 h-10 bg-[#2481cc] rounded-full flex items-center justify-center border-4 border-[#17212b] shadow-lg animate-fade-in">
                  <i className="fa-solid fa-camera text-white text-sm"></i>
                </button>
              )}
              <input type="file" ref={avatarInputRef} className="hidden" accept="image/*" onChange={handleAvatarChange} />
            </div>
            {!isEditing && (
              <div className="text-center">
                <h3 className="text-2xl font-bold mb-1">{user.username}</h3>
                <span className="text-[#2481cc] font-bold text-lg">@{user.username_handle.replace('@','')}</span>
              </div>
            )}
          </div>

          <div className="px-6 pb-12 space-y-6">
            {isEditing ? (
              <div className="space-y-6 animate-fade-in">
                <div className="space-y-2">
                  <div className="flex justify-between px-1">
                    <label className="text-[10px] font-black text-[#7f91a4] uppercase tracking-widest">Твое Имя</label>
                    <span className="text-[10px] text-[#7f91a4]">{editForm.username.length}/82</span>
                  </div>
                  <input maxLength={82} className="w-full bg-[#0e1621] p-4 rounded-2xl outline-none border-2 border-white/5 focus:border-[#2481cc] transition-all text-lg" value={editForm.username} onChange={e => setEditForm({...editForm, username: e.target.value})} />
                </div>
                <div className="space-y-2">
                   <div className="flex justify-between px-1">
                    <label className="text-[10px] font-black text-[#7f91a4] uppercase tracking-widest">Юзернейм</label>
                    <span className="text-[10px] text-[#7f91a4]">{editForm.username_handle.replace('@','').length}/16</span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#2481cc] font-bold">@</span>
                    <input className="w-full bg-[#0e1621] p-4 pl-8 rounded-2xl outline-none border-2 border-white/5 focus:border-[#2481cc] transition-all text-lg" value={editForm.username_handle.replace('@','')} onChange={e => setEditForm({...editForm, username_handle: '@' + e.target.value.toLowerCase().replace(/\s/g, '')})} />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-[#7f91a4] uppercase px-1 tracking-widest">О себе</label>
                  <textarea className="w-full bg-[#0e1621] p-4 rounded-2xl outline-none border-2 border-white/5 focus:border-[#2481cc] resize-none transition-all text-lg" rows={3} value={editForm.bio} onChange={e => setEditForm({...editForm, bio: e.target.value})} />
                </div>
                <button onClick={handleSave} className="w-full bg-[#2481cc] py-5 rounded-2xl font-bold active:scale-95 transition-all shadow-xl uppercase tracking-widest text-sm">СОХРАНИТЬ</button>
              </div>
            ) : (
              <>
                <div className="bg-[#0e1621]/50 p-6 rounded-3xl space-y-4 border border-white/5">
                   <div className="flex gap-4">
                      <i className="fa-solid fa-circle-info text-[#2481cc] mt-1 text-xl opacity-70"></i>
                      <div>
                        <div className="text-[16px] leading-relaxed break-words">{user.bio || 'Пользуюсь Mopsgram Pro 🐶'}</div>
                        <div className="text-[10px] font-black text-[#7f91a4] mt-2 uppercase tracking-widest">Информация</div>
                      </div>
                   </div>
                </div>

                {isMe && isSettings && (
                  <button onClick={() => setIsEditing(true)} className="w-full bg-white/5 py-4 rounded-2xl font-bold text-sm hover:bg-white/10 transition-colors border border-white/10 shadow-sm uppercase tracking-widest">
                    <i className="fa-solid fa-pen-to-square mr-2 opacity-70"></i>
                    Настроить профиль
                  </button>
                )}

                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-[#0e1621]/30 p-4 rounded-2xl text-center border border-white/5 backdrop-blur-sm">
                    <div className="text-xl font-black text-[#2481cc]">{mediaCounts.photos}</div>
                    <div className="text-[9px] text-[#7f91a4] font-bold uppercase mt-1">Фото</div>
                  </div>
                  <div className="bg-[#0e1621]/30 p-4 rounded-2xl text-center border border-white/5 backdrop-blur-sm">
                    <div className="text-xl font-black text-[#ef5350]">{mediaCounts.audio}</div>
                    <div className="text-[9px] text-[#7f91a4] font-bold uppercase mt-1">Аудио</div>
                  </div>
                  <div className="bg-[#0e1621]/30 p-4 rounded-2xl text-center border border-white/5 backdrop-blur-sm">
                    <div className="text-xl font-black text-amber-500">{mediaCounts.videos}</div>
                    <div className="text-[9px] text-[#7f91a4] font-bold uppercase mt-1">Видео</div>
                  </div>
                </div>

                {!isMe && (
                   <div className="flex gap-3">
                      <button className="flex-1 bg-[#2481cc] py-4 rounded-2xl font-bold text-sm active:scale-95 transition-all uppercase tracking-widest shadow-lg">Написать</button>
                      <button className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center border border-white/5 text-[#ef5350] active:scale-95 transition-all">
                        <i className="fa-solid fa-ban text-lg"></i>
                      </button>
                   </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileModal;
