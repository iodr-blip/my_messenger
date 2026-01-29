
import React, { useState, useEffect, useRef } from 'react';
import { AuthStep, User } from '../types';

interface AuthProps {
  onComplete: (user: User) => void;
}

const Auth: React.FC<AuthProps> = ({ onComplete }) => {
  const [step, setStep] = useState<AuthStep>('welcome');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState(['', '', '', '', '']);
  const [profile, setProfile] = useState({ username: '', handle: '@', bio: '', avatarUrl: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const codeRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleNext = async () => {
    setError(null);
    if (step === 'welcome') setStep('email');
    else if (step === 'email') {
      if (!validateEmail(email)) return setError('Введите корректный адрес почты');
      setIsLoading(true);
      setTimeout(() => { setIsLoading(false); setStep('code'); }, 1200);
    } else if (step === 'code') {
      setIsLoading(true);
      setTimeout(() => { setIsLoading(false); setStep('profile'); }, 800);
    } else if (step === 'profile') {
      if (profile.username.trim().length < 1) return setError('Введите имя');
      if (profile.handle.length < 5) return setError('Юзернейм должен быть не менее 5 символов');
      
      const newUser: User = {
        id: 'user_' + Math.random().toString(36).substr(2, 9),
        username: profile.username,
        username_handle: profile.handle,
        email: email,
        bio: profile.bio,
        avatarUrl: profile.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.username)}&background=2481cc&color=fff`,
        online: true,
        lastSeen: Date.now()
      };
      onComplete(newUser);
    }
  };

  const handleHandleChange = (val: string) => {
    if (!val.startsWith('@')) val = '@' + val;
    setProfile({ ...profile, handle: val });
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfile({ ...profile, avatarUrl: URL.createObjectURL(file) });
    }
  };

  const handleCodeChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    if (value.length > 1) value = value[0];
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    if (value && index < 4) codeRefs[index + 1].current?.focus();
    if (index === 4 && value) {
        setIsLoading(true);
        setTimeout(handleNext, 1000);
    }
  };

  return (
    <div className="h-screen w-full bg-[#0e1621] text-white flex flex-col items-center justify-center p-6 overflow-y-auto">
      {step === 'welcome' && (
        <div className="text-center animate-fade-in max-w-sm w-full">
          <div className="w-32 h-32 bg-[#2481cc] rounded-full flex items-center justify-center mx-auto mb-10 shadow-2xl">
            <i className="fa-solid fa-paper-plane text-5xl text-white ml-[-4px]"></i>
          </div>
          <h1 className="text-3xl font-bold mb-3 tracking-normal">Mopsgram Pro</h1>
          <p className="text-[#7f91a4] mb-12 text-lg">Самый быстрый и безопасный мессенджер.</p>
          <button onClick={handleNext} className="w-full bg-[#2481cc] py-4 rounded-xl font-semibold text-lg hover:bg-[#288fde] active:scale-95 transition-all shadow-lg">НАЧАТЬ ОБЩЕНИЕ</button>
        </div>
      )}

      {step === 'email' && (
        <div className="w-full max-w-sm animate-slide-up">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold mb-2">Ваш Email</h2>
            <p className="text-[#7f91a4] text-sm">Пожалуйста, подтвердите почту.</p>
          </div>
          <input type="email" autoFocus className="w-full bg-[#17212b] border-b-2 border-[#2b5278] p-4 outline-none focus:border-[#2481cc] mb-8 text-xl" placeholder="example@mail.com" value={email} onChange={e => setEmail(e.target.value)} />
          {error && <p className="text-red-500 text-sm mb-4 text-center">{error}</p>}
          <button onClick={handleNext} disabled={isLoading} className="w-full bg-[#2481cc] py-4 rounded-xl font-bold flex items-center justify-center gap-3 disabled:opacity-50">
            {isLoading ? <i className="fa-solid fa-circle-notch animate-spin"></i> : 'ДАЛЕЕ'}
          </button>
        </div>
      )}

      {step === 'code' && (
        <div className="w-full max-w-sm animate-slide-up text-center">
          <h2 className="text-2xl font-bold mb-2">Проверка кода</h2>
          <p className="text-[#7f91a4] mb-10 text-sm">Мы отправили письмо на <br/><span className="text-white font-medium">{email}</span></p>
          <div className="flex justify-center gap-3 mb-10">
            {code.map((d, i) => (
              <input key={i} ref={codeRefs[i]} type="text" maxLength={1} value={d} onChange={e => handleCodeChange(i, e.target.value)}
                className="w-12 h-16 bg-[#17212b] border-2 border-[#2b5278] rounded-xl text-center text-3xl font-bold focus:border-[#2481cc] outline-none transition-all"
              />
            ))}
          </div>
          {isLoading && <i className="fa-solid fa-circle-notch animate-spin text-[#2481cc] text-2xl"></i>}
        </div>
      )}

      {step === 'profile' && (
        <div className="w-full max-w-sm animate-slide-up space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">Ваш профиль</h2>
            <p className="text-[#7f91a4] text-sm">Настройте свою личность.</p>
          </div>
          
          <div className="flex justify-center">
            <div className="relative group cursor-pointer" onClick={() => avatarInputRef.current?.click()}>
              <div className="w-24 h-24 rounded-full bg-[#2481cc] flex items-center justify-center overflow-hidden border-2 border-white/10 shadow-xl">
                {profile.avatarUrl ? <img src={profile.avatarUrl} className="w-full h-full object-cover" /> : <i className="fa-solid fa-camera text-3xl opacity-50"></i>}
              </div>
              <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <i className="fa-solid fa-pencil text-white"></i>
              </div>
              <input type="file" ref={avatarInputRef} className="hidden" accept="image/*" onChange={handleAvatarChange} />
            </div>
          </div>

          <div className="space-y-4">
            <div>
               <label className="text-xs font-bold text-[#2481cc] mb-1 block uppercase tracking-wider">Имя</label>
               <input placeholder="Имя (отображаемое)" maxLength={64} className="w-full bg-[#17212b] p-4 rounded-xl outline-none border border-white/5 focus:border-[#2481cc]/50" value={profile.username} onChange={e => setProfile({...profile, username: e.target.value})} />
            </div>
            <div>
               <label className="text-xs font-bold text-[#2481cc] mb-1 block uppercase tracking-wider">@username</label>
               <input placeholder="@username (минимум 5 симв.)" className="w-full bg-[#17212b] p-4 rounded-xl outline-none border border-white/5 focus:border-[#2481cc]/50" value={profile.handle} onChange={e => handleHandleChange(e.target.value)} />
            </div>
            <div>
               <label className="text-xs font-bold text-[#2481cc] mb-1 block uppercase tracking-wider">О себе</label>
               <textarea placeholder="Пару слов о себе" className="w-full bg-[#17212b] p-4 rounded-xl outline-none border border-white/5 focus:border-[#2481cc]/50 h-24 resize-none" value={profile.bio} onChange={e => setProfile({...profile, bio: e.target.value})} />
            </div>
          </div>
          
          {error && <p className="text-red-500 text-sm text-center font-medium bg-red-500/10 py-2 rounded-lg">{error}</p>}
          <button onClick={handleNext} className="w-full bg-[#2481cc] py-4 rounded-xl font-bold mt-4 shadow-lg hover:bg-[#288fde]">ЗАВЕРШИТЬ</button>
        </div>
      )}
    </div>
  );
};

export default Auth;
