
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
    // Validation logic fix
    if (editForm.username.trim().length < 1) return alert('Имя не может быть пустым');
    if (editForm.username_handle.length < 5) return alert('Юзернейм должен быть не менее 5 символов');
    
    let updatedForm = { ...editForm };
    
    // Auto-update avatar if it's a default UI-avatar
    if (updatedForm.avatarUrl?.includes('ui-avatars.com')) {
      updatedForm.avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(updatedForm.username)}&background=2481cc&color=fff`;
    }

    onUpdate(updatedForm);
    setIsEditing(false);
  };

  const handleHandleChange = (val: string) => {
    if (!val.startsWith('@')) val = '@' + val;
    // Allow typing, validation happens on save
    setEditForm({ ...editForm, username_handle: val });
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setEditForm({ ...editForm, avatarUrl: URL.createObjectURL(file) });
    }
  };

  const mediaCounts = {
    photos: userMessages.filter(m => m.fileUrl && /\.(jpg|jpeg|png|gif|webp)$/i.test(m.fileName || '')).length,
    videos: userMessages.filter(m => m.fileUrl && /\.(mp4|mov|webm)$/i.test(m.fileName || '')).length,
    audio: userMessages.filter(m => m.audioUrl).length
  };

  const hasAnyMedia = mediaCounts.photos > 0 || mediaCounts.videos > 0 || mediaCounts.audio > 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      
      <div className="relative w-full max-w-[420px] bg-[#17212b] rounded-xl shadow-2xl overflow-hidden animate-slide-up flex flex-col max-h-[90vh]">
        {/* Header - ONLY BACK BUTTON */}
        <div className="flex items-center p-4 bg-[#17212b] border-b border-[#0e1621]">
          <button onClick={onClose} className="text-[#7f91a4] hover:text-white transition-colors p-2 -ml-2">
            <i className="fa-solid fa-arrow-left text-xl"></i>
          </button>
          <h2 className="text-xl font-bold ml-4">{isEditing ? 'Изменить' : 'Информация'}</h2>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Avatar & Name Section */}
          <div className="p-8 pb-4 flex flex-col items-center">
            <div className="relative group mb-6">
              <img 
                src={isEditing ? editForm.avatarUrl : user.avatarUrl} 
                className="w-32 h-32 rounded-full object-cover border-4 border-[#2481cc]/20 shadow-2xl" 
                key={isEditing ? editForm.username : user.username} // Force re-render for avatar refresh
              />
              {isEditing && (
                <button 
                  onClick={() => avatarInputRef.current?.click()}
                  className="absolute bottom-0 right-0 w-10 h-10 bg-[#ef5350] rounded-full flex items-center justify-center border-4 border-[#17212b] hover:bg-[#ef5350]/90 transition-all shadow-lg"
                >
                  <i className="fa-solid fa-camera text-white text-sm"></i>
                </button>
              )}
              <input type="file" ref={avatarInputRef} className="hidden" accept="image/*" onChange={handleAvatarChange} />
            </div>
            {!isEditing && (
              <div className="text-center">
                <h3 className="text-2xl font-bold mb-1">{user.username}</h3>
                <span className="text-[#7f91a4] text-sm">был(а) недавно</span>
              </div>
            )}
          </div>

          <div className="h-[1px] bg-white/5 mx-6 mb-4" />

          {isEditing ? (
            <div className="px-6 py-4 space-y-6">
               <div className="bg-[#0e1621]/40 p-4 rounded-xl border border-white/5">
                 <label className="text-xs font-bold text-[#ef5350] block mb-2 uppercase tracking-widest">О себе</label>
                 <textarea 
                    className="w-full bg-transparent outline-none resize-none text-[15px] leading-relaxed" 
                    rows={3}
                    placeholder="Пару слов о себе..."
                    value={editForm.bio}
                    onChange={e => setEditForm({...editForm, bio: e.target.value})}
                 />
               </div>

               <div className="space-y-6 px-2">
                 <div className="flex items-center gap-6">
                    <i className="fa-solid fa-circle-user text-[#7f91a4] w-6 text-center text-xl"></i>
                    <div className="flex-1 border-b border-[#0e1621] pb-2">
                       <label className="text-[11px] text-[#ef5350] block">Имя (отображаемое)</label>
                       <input 
                        className="w-full bg-transparent outline-none py-1 text-[16px]"
                        value={editForm.username}
                        maxLength={64}
                        onChange={e => setEditForm({...editForm, username: e.target.value})}
                       />
                    </div>
                 </div>

                 <div className="flex items-center gap-6">
                    <i className="fa-solid fa-at text-[#7f91a4] w-6 text-center text-xl"></i>
                    <div className="flex-1 border-b border-[#0e1621] pb-2">
                       <label className="text-[11px] text-[#ef5350] block">Юзернейм (минимум 5 симв.)</label>
                       <input 
                        className="w-full bg-transparent outline-none py-1 text-[16px]"
                        value={editForm.username_handle}
                        onChange={e => handleHandleChange(e.target.value)}
                       />
                    </div>
                 </div>
               </div>

               <button 
                onClick={handleSave}
                className="w-full bg-[#ef5350] py-4 rounded-xl font-bold text-white shadow-xl hover:bg-[#ef5350]/90 transition-all mt-4"
               >
                 СОХРАНИТЬ ИЗМЕНЕНИЯ
               </button>
            </div>
          ) : (
            <div className="space-y-0">
              {/* Profile Info Rows */}
              <div className="px-6 py-4 space-y-6">
                 <div className="flex items-start gap-8">
                    <i className="fa-solid fa-circle-info text-[#7f91a4] w-6 text-center text-xl mt-1"></i>
                    <div className="flex-1">
                       <div className="text-[15px] text-white leading-snug">{user.bio || 'Нет описания.'}</div>
                       <div className="text-[13px] text-[#7f91a4]">О себе</div>
                    </div>
                 </div>

                 <div className="flex items-start gap-8">
                    <i className="fa-solid fa-at text-[#2481cc] w-6 text-center text-xl mt-1"></i>
                    <div className="flex-1">
                       <div className="text-[15px] text-[#ef5350]">{user.username_handle}</div>
                       <div className="text-[13px] text-[#7f91a4]">Имя пользователя</div>
                    </div>
                 </div>

                 {/* Notifications Toggle - HIDDEN FOR ME */}
                 {!isMe && (
                   <div className="flex items-center gap-8">
                      <i className="fa-solid fa-bell text-[#7f91a4] w-6 text-center text-xl"></i>
                      <div className="flex-1 flex justify-between items-center border-b border-white/5 pb-4">
                         <span className="text-[15px]">Уведомления</span>
                         <div className="w-10 h-5 bg-[#2b5278] rounded-full relative">
                            <div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full"></div>
                         </div>
                      </div>
                   </div>
                 )}
              </div>

              {/* Edit button */}
              {isMe && isSettings && (
                 <div className="px-6 pb-6">
                    <button 
                        onClick={() => setIsEditing(true)}
                        className="w-full text-center py-2 text-[#2481cc] font-bold text-sm tracking-wide hover:bg-white/5 rounded-lg transition-colors"
                    >
                        ИЗМЕНИТЬ ПРОФИЛЬ
                    </button>
                 </div>
              )}

              {/* Media Block */}
              {hasAnyMedia && (
                <>
                  <div className="h-2 bg-[#0e1621]" />
                  <div className="px-6 py-4 space-y-4">
                    {mediaCounts.photos > 0 && (
                      <button className="w-full flex items-center gap-8 py-1 group">
                          <i className="fa-solid fa-image text-[#7f91a4] w-6 text-center text-xl"></i>
                          <span className="text-[15px] text-white">{mediaCounts.photos} {mediaCounts.photos === 1 ? 'фотография' : 'фотографий'}</span>
                      </button>
                    )}
                    {mediaCounts.videos > 0 && (
                      <button className="w-full flex items-center gap-8 py-1 group">
                          <i className="fa-solid fa-video text-[#7f91a4] w-6 text-center text-xl"></i>
                          <span className="text-[15px] text-white">{mediaCounts.videos} {mediaCounts.videos === 1 ? 'видео' : 'видео'}</span>
                      </button>
                    )}
                    {mediaCounts.audio > 0 && (
                      <button className="w-full flex items-center gap-8 py-1 group">
                          <i className="fa-solid fa-microphone text-[#7f91a4] w-6 text-center text-xl"></i>
                          <span className="text-[15px] text-white">{mediaCounts.audio} {mediaCounts.audio === 1 ? 'голосовое сообщение' : 'голосовых сообщений'}</span>
                      </button>
                    )}
                  </div>
                </>
              )}

              <div className="h-8 bg-[#0e1621]" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileModal;
