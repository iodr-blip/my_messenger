
import React, { useState, useEffect } from 'react';
import { Chat, User } from '../types';
import { db } from '../services/firebase';
import { doc, updateDoc, deleteDoc, onSnapshot, collection, query, where, getDocs } from 'firebase/firestore';
import { VerifiedIcon } from './Messenger';

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

  const handleDeleteGroup = async () => {
    if (confirm('Удалить и покинуть группу?')) {
      await deleteDoc(doc(db, 'chats', chat.id));
      onExitGroup();
    }
  };

  const SettingRow = ({ icon, label, value, color = "text-white" }: any) => (
    <div className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors border-b border-white/5 group">
      <div className="flex items-center gap-4">
        <i className={`fa-solid ${icon} w-5 text-center text-[#7f91a4] group-hover:text-white transition-colors`}></i>
        <span className="text-[15px] font-medium">{label}</span>
      </div>
      <span className={`text-[15px] font-bold ${color}`}>{value}</span>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[250] flex flex-col bg-[#0e1621] animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/5 bg-[#17212b] shrink-0 z-10">
        <button onClick={isEditing ? () => setIsEditing(false) : onClose} className="text-[#7f91a4] hover:text-white p-1">
          <i className="fa-solid fa-arrow-left text-lg"></i>
        </button>
        <h2 className="text-[17px] font-bold">{isEditing ? 'Изменить' : ''}</h2>
        {isEditing ? (
          <button onClick={handleSave} className="text-blue-400 font-bold p-1">
            <i className="fa-solid fa-check text-xl"></i>
          </button>
        ) : (
          <button onClick={() => setIsEditing(true)} className="text-[#7f91a4] hover:text-white p-1">
            <i className="fa-solid fa-pen text-lg"></i>
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar pb-10">
        {/* Main Info Section */}
        <div className="bg-[#17212b] flex flex-col items-center p-8 border-b border-[#0e1621] shrink-0">
          <div className="relative w-28 h-28 rounded-full overflow-hidden mb-5 shadow-2xl border-2 border-white/10">
            <img src={chat.avatarUrl} className="w-full h-full object-cover" />
            {isEditing && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center cursor-pointer">
                <i className="fa-solid fa-camera text-white text-xl"></i>
              </div>
            )}
          </div>
          
          {isEditing ? (
            <div className="w-full max-w-xs space-y-6">
              <div className="border-b border-blue-500 py-1">
                <input 
                  className="w-full bg-transparent text-center text-xl font-bold outline-none text-white"
                  value={name} onChange={e => setName(e.target.value)} placeholder="Название"
                />
              </div>
              <div className="text-center">
                <button className="text-blue-400 font-bold text-sm">Выбрать фотографию</button>
              </div>
              <div className="border-b border-white/5 py-1">
                 <input 
                  className="w-full bg-transparent text-center text-sm outline-none text-white placeholder:text-[#7f91a4]"
                  value={desc} onChange={e => setDesc(e.target.value)} placeholder="Описание (необязательно)"
                />
              </div>
            </div>
          ) : (
            <div className="text-center">
              <h3 className="text-2xl font-bold text-white mb-1">{chat.name}</h3>
              <span className="text-sm text-[#7f91a4]">{chat.participantsUids?.length} участников</span>
            </div>
          )}
        </div>

        {/* Action Buttons (Profile View Only) */}
        {!isEditing && (
          <div className="flex items-center justify-center gap-4 py-4 px-6 bg-[#17212b] border-b border-[#0e1621]">
            <button onClick={onClose} className="flex flex-col items-center gap-1.5 w-20 py-2 hover:bg-white/5 rounded-xl transition-all group">
              <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-blue-400 group-hover:bg-blue-400/10"><i className="fa-solid fa-message"></i></div>
              <span className="text-[11px] font-bold text-[#7f91a4]">Чат</span>
            </button>
            <button onClick={handleDeleteGroup} className="flex flex-col items-center gap-1.5 w-20 py-2 hover:bg-red-500/5 rounded-xl transition-all group">
              <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-red-500 group-hover:bg-red-500/10"><i className="fa-solid fa-arrow-right-from-bracket"></i></div>
              <span className="text-[11px] font-bold text-[#7f91a4]">Покинуть</span>
            </button>
          </div>
        )}

        {/* Description Section (Profile View Only) */}
        {!isEditing && chat.description && (
          <div className="mt-4 p-4 bg-[#17212b] border-y border-[#0e1621]">
            <p className="text-white text-[15px]">{chat.description}</p>
            <span className="text-[#7f91a4] text-xs mt-1 block">Описание</span>
          </div>
        )}

        {/* Settings rows (Edit Mode) */}
        {isEditing ? (
          <div className="mt-4 bg-[#17212b] border-y border-[#0e1621]">
            <SettingRow icon="fa-lock" label="Тип группы" value="Частная" color="text-blue-400" />
            <SettingRow icon="fa-clock-rotate-left" label="История чата" value={chat.historyVisible ? "Видна" : "Скрыта"} color="text-blue-400" />
            <div className="h-4 bg-[#0e1621]"></div>
            <SettingRow icon="fa-link" label="Пригласительные ссылки" value="1" color="text-blue-400" />
            <SettingRow icon="fa-shield-halved" label="Администраторы" value="1" color="text-blue-400" />
            <SettingRow icon="fa-users" label="Участники" value={chat.participantsUids?.length} color="text-blue-400" />
            
            <div className="p-4 mt-4">
              <button onClick={handleDeleteGroup} className="w-full py-4 text-red-500 font-bold hover:bg-red-500/10 rounded-2xl transition-all">Удалить и покинуть группу</button>
            </div>
          </div>
        ) : (
          <div className="mt-4">
            {/* Participant Section (Profile View Only) */}
            <div className="bg-[#17212b] border-y border-[#0e1621]">
              <button onClick={onAddParticipant} className="w-full flex items-center gap-5 p-4 hover:bg-white/5 transition-all text-left group">
                <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 group-hover:bg-blue-400/20"><i className="fa-solid fa-user-plus"></i></div>
                <span className="text-[15px] font-bold text-blue-400">Добавить участников</span>
              </button>
              
              {participants.map(p => (
                <button 
                  key={p.id} 
                  onClick={() => onProfileClick(p)}
                  className="w-full flex items-center gap-4 p-4 hover:bg-white/5 transition-colors group relative text-left"
                >
                  <div className="relative shrink-0">
                    <img src={p.avatarUrl} className="w-10 h-10 rounded-full object-cover border border-white/5" />
                    {p.online && <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-[#17212b] rounded-full" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                      <span className="text-white font-bold text-[15px] truncate">{p.username} {p.surname || ''}</span>
                      {p.id === chat.ownerId && <span className="text-blue-400 text-[11px] font-bold">Владелец</span>}
                    </div>
                    <div className={`text-xs ${p.online ? 'text-blue-400' : 'text-[#7f91a4]'}`}>
                      {p.online ? 'в сети' : 'был(а) недавно'}
                    </div>
                  </div>
                  <div className="absolute bottom-0 left-16 right-0 h-[0.5px] bg-white/[0.04]"></div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GroupSettingsModal;
