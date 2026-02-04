
import React, { useState, useEffect } from 'react';
import { Chat, User } from '../types';
import { db } from '../services/firebase';
import { doc, updateDoc, deleteDoc, onSnapshot, collection, query, where } from 'firebase/firestore';

interface GroupSettingsModalProps {
  chat: Chat;
  currentUser: User;
  onClose: () => void;
  onExitGroup: () => void;
  onAddParticipant: () => void;
  onProfileClick: (user: User) => void;
}

const GroupSettingsModal: React.FC<GroupSettingsModalProps> = ({ chat, currentUser, onClose, onExitGroup, onAddParticipant, onProfileClick }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(chat.name || '');
  const [desc, setDesc] = useState(chat.description || '');
  const [participants, setParticipants] = useState<User[]>([]);

  useEffect(() => {
    if (!chat.participantsUids || chat.participantsUids.length === 0) return;
    const q = query(collection(db, 'users'), where('__name__', 'in', chat.participantsUids));
    const unsub = onSnapshot(q, (snap) => {
      setParticipants(snap.docs.map(d => ({ id: d.id, ...d.data() } as User)));
    });
    return () => unsub();
  }, [chat.participantsUids]);

  const handleSave = async () => {
    await updateDoc(doc(db, 'chats', chat.id), {
      name: name.trim(),
      description: desc.trim()
    });
    setIsEditing(false);
  };

  const getParticipantCountText = (count: number) => {
    if (count % 10 === 1 && count % 100 !== 11) return `${count} участник`;
    if ([2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100)) return `${count} участника`;
    return `${count} участников`;
  };

  const formatLastSeen = (user: User) => {
    if (user.online) return 'в сети';
    if (!user.lastSeen) return 'был(а) недавно';
    const now = Date.now();
    const diff = now - user.lastSeen;
    const mins = Math.floor(diff / 60000);
    
    if (mins < 1) return 'был(а) только что';
    if (mins < 60) return `был(а) ${mins} мин. назад`;
    
    const d = new Date(user.lastSeen);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    
    if (d.toDateString() === today.toDateString()) {
      return `был(а) сегодня в ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    if (d.toDateString() === yesterday.toDateString()) {
      return `был(а) вчера в ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    return `был(а) ${d.toLocaleDateString()}`;
  };

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      
      <div className="relative w-full sm:max-w-[400px] bg-[#17212b] sm:rounded-2xl shadow-2xl overflow-hidden animate-slide-up flex flex-col border border-white/5 max-h-screen sm:max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 px-5 shrink-0">
          <h2 className="text-[17px] font-bold text-white">Информация о группе</h2>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsEditing(!isEditing)} 
              className="text-[#7f91a4] hover:text-white transition-colors"
            >
              <i className={`fa-solid ${isEditing ? 'fa-check text-blue-400' : 'fa-pen'} text-[16px]`}></i>
            </button>
            <button onClick={onClose} className="text-[#7f91a4] hover:text-white transition-colors">
              <i className="fa-solid fa-xmark text-xl"></i>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar">
          {/* Hero Section */}
          <div className="px-6 py-6 flex items-center gap-6 border-b border-[#0e1621]">
            <div className="relative shrink-0">
              <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-white/5 shadow-lg bg-[#3390ec] flex items-center justify-center">
                {chat.avatarUrl ? (
                  <img src={chat.avatarUrl} className="w-full h-full object-cover" alt="avatar" />
                ) : (
                  <span className="text-3xl font-bold text-white uppercase">{chat.name?.[0]}</span>
                )}
              </div>
              {isEditing && (
                <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center cursor-pointer backdrop-blur-[1px]">
                  <i className="fa-solid fa-camera text-white text-lg"></i>
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              {isEditing ? (
                <input 
                  autoFocus
                  className="w-full bg-transparent text-xl font-bold outline-none text-white border-b border-blue-500/50 focus:border-blue-500 pb-1"
                  value={name} onChange={e => setName(e.target.value)}
                />
              ) : (
                <h3 className="text-xl font-bold text-white truncate leading-tight mb-1">{chat.name}</h3>
              )}
              <span className="text-[14px] text-[#7f91a4]">{getParticipantCountText(participants.length)}</span>
            </div>
          </div>

          {/* Description Block */}
          <div className="px-6 py-4 flex items-start gap-6 border-b border-[#0e1621] hover:bg-white/[0.02] transition-colors group cursor-default">
            <div className="w-9 h-9 rounded-full bg-[#7f91a4]/10 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-blue-400/10 transition-colors">
              <i className="fa-solid fa-info text-[#7f91a4] text-[13px] group-hover:text-blue-400"></i>
            </div>
            <div className="flex-1 min-w-0">
              {isEditing ? (
                <textarea 
                  className="w-full bg-transparent text-[15px] outline-none text-white border-b border-white/10 focus:border-blue-500 transition-all resize-none py-1"
                  rows={2}
                  value={desc} onChange={e => setDesc(e.target.value)}
                  placeholder="Добавьте описание..."
                />
              ) : (
                <div className="text-[15px] text-white leading-relaxed break-words">{chat.description || '.'}</div>
              )}
              <div className="text-[#7f91a4] text-[13px] mt-1">Информация</div>
            </div>
          </div>

          {/* Participants List */}
          <div className="mt-2">
            <div className="px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-6">
                <i className="fa-solid fa-users text-[#7f91a4] w-10 text-center text-lg"></i>
                <span className="text-[13px] font-bold text-[#7f91a4] uppercase tracking-wider">
                  {getParticipantCountText(participants.length).toUpperCase()}
                </span>
              </div>
              <button 
                onClick={onAddParticipant}
                className="text-[#7f91a4] hover:text-blue-400 p-2 transition-all active:scale-90"
              >
                <i className="fa-solid fa-user-plus text-lg"></i>
              </button>
            </div>

            <div className="flex flex-col">
              {participants.map(p => (
                <button 
                  key={p.id} 
                  onClick={() => onProfileClick(p)}
                  className="w-full flex items-center gap-4 px-6 py-3.5 hover:bg-white/[0.03] transition-all group relative text-left"
                >
                  <div className="relative shrink-0">
                    <img src={p.avatarUrl} className="w-12 h-12 rounded-full object-cover border border-white/5" alt="avatar" />
                    {p.online && <div className="absolute bottom-0.5 right-0.5 w-3 h-3 bg-green-500 border-2 border-[#17212b] rounded-full" />}
                  </div>
                  <div className="flex-1 min-w-0 pr-4">
                    <div className="flex justify-between items-center mb-0.5">
                      <span className="text-white font-bold text-[15px] truncate">{p.username} {p.surname || ''}</span>
                      {p.id === chat.ownerId && (
                        <span className="text-blue-400 text-[12px] font-medium ml-2 shrink-0">владелец</span>
                      )}
                    </div>
                    <div className={`text-[13px] ${p.online ? 'text-blue-400' : 'text-[#7f91a4]'}`}>
                      {formatLastSeen(p)}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Danger Actions (Edit Mode) */}
        {isEditing && (
          <div className="p-4 bg-[#0e1621]/30 border-t border-white/5 shrink-0">
            <button 
              onClick={handleSave}
              className="w-full py-3.5 mb-2 bg-blue-500 text-white font-bold rounded-xl active:scale-[0.98] transition-all shadow-lg shadow-blue-500/10"
            >
              Сохранить изменения
            </button>
            <button 
              onClick={onExitGroup}
              className="w-full py-3.5 text-red-500 font-bold hover:bg-red-500/10 rounded-xl transition-all"
            >
              Удалить и покинуть группу
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default GroupSettingsModal;
