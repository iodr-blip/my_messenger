
import React, { useState, useRef } from 'react';
import { User } from '../types';
import { db } from '../services/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import ImageCropper from './ProfileModal'; // We can reuse parts or logic, but for simplicity let's implement a local version or assume the cropper is available.

interface GroupCreateModalProps {
  currentUser: User;
  onClose: () => void;
  onCreated: (chatId: string) => void;
}

const GroupCreateModal: React.FC<GroupCreateModalProps> = ({ currentUser, onClose, onCreated }) => {
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setAvatar(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleCreate = async () => {
    if (!name.trim() || loading) return;
    setLoading(true);
    try {
      const chatData = {
        type: 'group',
        name: name.trim(),
        avatarUrl: avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=3390ec&color=fff`,
        ownerId: currentUser.id,
        participantsUids: [currentUser.id],
        createdAt: serverTimestamp(),
        historyVisible: false,
        inviteLink: '', 
        unreadCounts: { [currentUser.id]: 0 }
      };
      const docRef = await addDoc(collection(db, 'chats'), chatData);
      onCreated(docRef.id);
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-[#17212b] animate-fade-in sm:items-center sm:justify-center">
      <div className="flex items-center p-4 border-b border-[#0e1621] sm:w-full sm:max-w-md">
        <button onClick={onClose} className="text-white p-2 active:scale-90 transition-transform">
          <i className="fa-solid fa-arrow-left text-lg"></i>
        </button>
        <h2 className="flex-1 text-center font-bold text-lg text-white">Создать группу</h2>
        <div className="w-10"></div>
      </div>

      <div className="flex-1 p-6 flex flex-col items-center gap-8 sm:w-full sm:max-w-md">
        <div 
          className="relative w-24 h-24 rounded-full bg-blue-500/20 flex items-center justify-center cursor-pointer group overflow-hidden border-2 border-dashed border-blue-500/30 active:scale-95 transition-all"
          onClick={() => fileInputRef.current?.click()}
        >
          {avatar ? (
            <img src={avatar} className="w-full h-full object-cover" />
          ) : (
            <i className="fa-solid fa-camera text-3xl text-blue-500"></i>
          )}
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
        </div>

        <div className="w-full border-b border-blue-500/50 pb-2 flex items-center gap-3">
          <input 
            type="text" 
            placeholder="Название группы" 
            className="flex-1 bg-transparent outline-none text-white text-lg font-medium placeholder:text-[#7f91a4]"
            value={name}
            onChange={e => setName(e.target.value)}
            autoFocus
          />
        </div>
      </div>

      <div className="p-6 pb-[max(env(safe-area-inset-bottom),24px)] flex justify-end sm:w-full sm:max-w-md">
        <button 
          onClick={handleCreate}
          disabled={!name.trim() || loading}
          className={`w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all active:scale-90 ${name.trim() ? 'bg-blue-500 text-white shadow-blue-500/20' : 'bg-gray-700 text-gray-500'}`}
        >
          {loading ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-check text-2xl"></i>}
        </button>
      </div>
    </div>
  );
};

export default GroupCreateModal;
