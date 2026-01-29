
import React, { useState, useRef } from 'react';
import { AuthStep, User } from '../types';
import { auth, db } from '../services/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword
} from 'firebase/auth';
import { doc, setDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';

interface AuthProps {
  onComplete: (user: User) => void;
}

const Auth: React.FC<AuthProps> = ({ onComplete }) => {
  const [step, setStep] = useState<AuthStep>('welcome');
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [profile, setProfile] = useState({ username: '', bio: '', avatarUrl: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isNewUser, setIsNewUser] = useState(false);
  
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const getVirtualEmail = (username: string) => {
    const clean = username.replace('@', '').toLowerCase().trim();
    return `${clean}@mopsgram.app`;
  };

  const checkUserInFirestore = async (username: string) => {
    const handle = username.startsWith('@') ? username.toLowerCase() : `@${username.toLowerCase()}`;
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('username_handle', '==', handle));
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  };

  const handleNext = async () => {
    setError(null);
    
    if (step === 'welcome') {
      setStep('email');
      return;
    }

    if (step === 'email') {
      const cleanLogin = login.replace('@', '').trim().toLowerCase();
      if (cleanLogin.length < 5) return setError('Юзернейм должен быть не менее 5 символов');
      if (cleanLogin.length > 16) return setError('Юзернейм должен быть не более 16 символов');
      if (!/^[a-z0-9_]+$/.test(cleanLogin)) return setError('Только буквы, цифры и нижнее подчеркивание');
      
      setIsLoading(true);
      try {
        const exists = await checkUserInFirestore(cleanLogin);
        setIsNewUser(!exists);
        setStep('password');
      } catch (err: any) {
        setError('Ошибка сети. Попробуйте VPN или проверьте соединение.');
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (step === 'password') {
      if (password.length < 6) return setError('Пароль должен быть не менее 6 символов');
      
      if (isNewUser) {
        setStep('profile');
        return;
      }

      setIsLoading(true);
      const email = getVirtualEmail(login);
      
      try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
        
        if (userDoc.exists()) {
          onComplete(userDoc.data() as User);
        } else {
          setIsNewUser(true);
          setStep('profile');
        }
      } catch (err: any) {
        if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
          setError('Неверный пароль.');
        } else {
          setError('Ошибка: ' + err.code);
        }
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (step === 'profile') {
      const handle = login.startsWith('@') ? login.toLowerCase() : `@${login.toLowerCase()}`;
      if (profile.username.trim().length < 1) return setError('Введите ваше имя');
      if (profile.username.length > 82) return setError('Имя не может быть длиннее 82 символов');
      
      setIsLoading(true);
      const email = getVirtualEmail(login);
      
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const newUser: User = {
          id: userCredential.user.uid,
          username: profile.username,
          username_handle: handle,
          email: email,
          bio: profile.bio || 'Пользуюсь Mopsgram Pro 🐶',
          avatarUrl: profile.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.username)}&background=2481cc&color=fff`,
          online: true,
          lastSeen: Date.now()
        };
        
        await setDoc(doc(db, 'users', newUser.id), newUser);
        onComplete(newUser);
      } catch (err: any) {
        if (err.code === 'auth/email-already-in-use') {
          setError('Этот логин уже занят.');
          setIsNewUser(false);
          setStep('password');
        } else {
          setError('Ошибка регистрации: ' + err.code);
        }
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setProfile({ ...profile, avatarUrl: reader.result as string });
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="h-screen w-full bg-[#0e1621] text-white flex flex-col items-center justify-center p-6 overflow-y-auto chat-bg">
      <div className="w-full max-w-sm flex flex-col animate-fade-in">
        
        {step === 'welcome' && (
          <div className="text-center">
            <div className="w-28 h-28 bg-gradient-to-tr from-[#2481cc] to-[#2b5278] rounded-[30%] flex items-center justify-center mx-auto mb-8 shadow-2xl animate-bounce-slow border-4 border-white/10 rotate-12">
              <i className="fa-solid fa-dog text-5xl text-white -rotate-12"></i>
            </div>
            <h1 className="text-4xl font-black mb-4 tracking-tighter">Mopsgram Pro</h1>
            <p className="text-[#7f91a4] mb-12 text-lg">Быстрый. Безопасный. <br/>Твой любимый мессенджер.</p>
            <button onClick={handleNext} className="w-full bg-[#2481cc] py-4 rounded-2xl font-bold text-lg active:scale-95 transition-all shadow-lg hover:brightness-110">
              НАЧАТЬ ОБЩЕНИЕ
            </button>
          </div>
        )}

        {step === 'email' && (
          <div className="animate-slide-up">
            <h2 className="text-3xl font-bold text-center mb-2">Юзернейм</h2>
            <p className="text-[#7f91a4] text-center text-sm mb-10 px-4">Это твой уникальный адрес (от 5 до 16 симв.)</p>
            <div className="relative mb-8">
              <span className="absolute left-5 top-1/2 -translate-y-1/2 text-xl text-[#2481cc] font-bold">@</span>
              <input 
                type="text" 
                autoFocus 
                maxLength={16}
                className="w-full bg-[#17212b] border-2 border-[#2b5278] rounded-2xl p-5 pl-12 outline-none focus:border-[#2481cc] text-xl font-medium transition-all placeholder:text-white/10" 
                placeholder="username" 
                value={login} 
                onChange={e => setLogin(e.target.value.replace('@', '').replace(/\s/g, '').toLowerCase())} 
                onKeyDown={e => e.key === 'Enter' && handleNext()} 
              />
              <div className="absolute right-5 top-1/2 -translate-y-1/2 text-[10px] text-[#7f91a4] font-bold uppercase">
                {login.length}/16
              </div>
            </div>
            {error && <p className="text-red-500 text-sm mb-6 text-center bg-red-500/10 py-3 rounded-xl font-medium border border-red-500/20">{error}</p>}
            <button onClick={handleNext} disabled={isLoading} className="w-full bg-[#2481cc] py-4 rounded-2xl font-bold text-lg active:scale-95 transition-all shadow-xl h-[64px] flex items-center justify-center">
              {isLoading ? <i className="fa-solid fa-circle-notch animate-spin text-2xl"></i> : 'ДАЛЕЕ'}
            </button>
          </div>
        )}

        {step === 'password' && (
          <div className="animate-slide-up">
            <h2 className="text-3xl font-bold text-center mb-2">Защита</h2>
            <p className="text-[#7f91a4] text-center text-sm mb-10 px-4">
              {isNewUser ? 'Придумай надежный пароль' : 'Введи свой пароль для'} <br/>
              <span className="text-[#2481cc] font-bold">@{login}</span>
            </p>
            <input 
              type="password" 
              autoFocus 
              className="w-full bg-[#17212b] border-2 border-[#2b5278] rounded-2xl p-5 outline-none focus:border-[#2481cc] mb-8 text-xl font-medium transition-all" 
              placeholder="••••••••" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              onKeyDown={e => e.key === 'Enter' && handleNext()} 
            />
            {error && <p className="text-red-500 text-sm mb-6 text-center bg-red-500/10 py-3 rounded-xl font-medium border border-red-500/20">{error}</p>}
            <button onClick={handleNext} disabled={isLoading} className="w-full bg-[#2481cc] py-4 rounded-2xl font-bold text-lg active:scale-95 transition-all shadow-xl h-[64px] flex items-center justify-center">
              {isLoading ? <i className="fa-solid fa-circle-notch animate-spin text-2xl"></i> : (isNewUser ? 'ДАЛЕЕ' : 'ВОЙТИ')}
            </button>
            <button onClick={() => setStep('email')} className="w-full mt-6 text-[#7f91a4] text-sm hover:text-white transition-colors font-medium">Сменить юзернейм</button>
          </div>
        )}

        {step === 'profile' && (
          <div className="animate-slide-up space-y-6">
            <div className="text-center">
              <h2 className="text-3xl font-bold mb-2">О себе</h2>
              <p className="text-[#7f91a4] text-sm">Почти готово, <span className="text-[#2481cc] font-bold">@{login}</span></p>
            </div>
            
            <div className="flex justify-center">
              <div className="relative cursor-pointer group" onClick={() => avatarInputRef.current?.click()}>
                <div className="w-28 h-28 rounded-full bg-[#17212b] flex items-center justify-center overflow-hidden border-4 border-white/5 shadow-2xl transition-transform group-active:scale-95">
                  {profile.avatarUrl ? (
                    <img src={profile.avatarUrl} className="w-full h-full object-cover" />
                  ) : (
                    <i className="fa-solid fa-camera text-4xl opacity-30 text-[#2481cc]"></i>
                  )}
                </div>
                <div className="absolute bottom-0 right-0 bg-[#2481cc] w-9 h-9 rounded-full flex items-center justify-center border-4 border-[#0e1621] text-xs shadow-lg">
                  <i className="fa-solid fa-plus"></i>
                </div>
                <input type="file" ref={avatarInputRef} className="hidden" accept="image/*" onChange={handleAvatarChange} />
              </div>
            </div>

            <div className="space-y-4">
               <div>
                  <div className="flex justify-between items-end mb-1.5 px-1">
                    <label className="text-[11px] font-black text-[#2481cc] uppercase tracking-widest">Твое Имя</label>
                    <span className="text-[10px] text-[#7f91a4]">{profile.username.length}/82</span>
                  </div>
                  <input 
                    placeholder="Напр. Артем" 
                    maxLength={82}
                    className="w-full bg-[#17212b] p-5 rounded-2xl outline-none border-2 border-white/5 focus:border-[#2481cc] text-lg transition-all" 
                    value={profile.username} 
                    onChange={e => setProfile({...profile, username: e.target.value})} 
                  />
               </div>
               <div>
                  <label className="text-[11px] font-black text-[#2481cc] mb-1.5 block uppercase tracking-widest px-1">О себе</label>
                  <input 
                    placeholder="Кратко о себе..." 
                    className="w-full bg-[#17212b] p-5 rounded-2xl outline-none border-2 border-white/5 focus:border-[#2481cc] text-lg transition-all" 
                    value={profile.bio} 
                    onChange={e => setProfile({...profile, bio: e.target.value})} 
                  />
               </div>
            </div>
            
            {error && <p className="text-red-500 text-sm text-center bg-red-500/10 py-3 rounded-xl border border-red-500/20 font-medium">{error}</p>}
            <button onClick={handleNext} disabled={isLoading} className="w-full bg-[#2481cc] py-4 rounded-2xl font-bold text-lg shadow-xl active:scale-95 transition-all h-[64px] flex items-center justify-center uppercase tracking-widest">
               {isLoading ? <i className="fa-solid fa-circle-notch animate-spin text-2xl"></i> : 'СОЗДАТЬ АККАУНТ'}
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

export default Auth;
