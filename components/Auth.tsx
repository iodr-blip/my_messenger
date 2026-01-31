
import React, { useState } from 'react';
import { User, AuthStep } from '../types';
import { auth, db } from '../services/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDocs, collection, query, where } from 'firebase/firestore';

interface AuthProps {
  onComplete: (user: User) => void;
}

const Auth: React.FC<AuthProps> = ({ onComplete }) => {
  const [step, setStep] = useState<AuthStep>('welcome');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [usernameHandle, setUsernameHandle] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  const handleError = (err: any) => {
    console.error("Auth Error:", err);
    if (err.code === 'auth/configuration-not-found') {
      setError('Метод входа по Email/паролю не включен в консоли Firebase.');
    } else if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
      setError('Неверная почта или пароль');
    } else if (err.code === 'auth/email-already-in-use') {
      setError('Этот email уже зарегистрирован');
    } else if (err.message.includes('permission-denied')) {
      setError('Ошибка доступа к базе данных.');
    } else {
      setError(err.message || 'Произошла ошибка при аутентификации');
    }
    setLoading(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email || !password) return setError('Заполните все поля');

    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      handleError(err);
    }
  };

  const nextRegisterStep = async () => {
    setError(null);
    try {
      if (step === 'register_creds') {
        if (!email || !password || !confirmPassword) return setError('Заполните все поля');
        if (password !== confirmPassword) return setError('Пароли не совпадают');
        if (password.length < 6) return setError('Пароль слишком короткий');
        setStep('register_username');
      } else if (step === 'register_username') {
        if (!usernameHandle) return setError('Введите юзернейм');
        const handle = `@${usernameHandle.toLowerCase().replace(/[^a-z0-9_]/g, '')}`;
        
        setLoading(true);
        const q = query(collection(db, 'users'), where('username_handle', '==', handle));
        const querySnapshot = await getDocs(q);
        setLoading(false);
        
        if (!querySnapshot.empty) return setError('Этот юзернейм занят');
        setStep('register_profile');
      }
    } catch (err: any) {
      handleError(err);
    }
  };

  const finishRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim()) return setError('Имя обязательно');

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const fbUser = userCredential.user;
      const handle = `@${usernameHandle.toLowerCase().replace(/[^a-z0-9_]/g, '')}`;
      
      const userData = {
        username: firstName,
        surname: lastName,
        username_handle: handle,
        email: email,
        bio: 'Пользуюсь MeganNait 💎',
        avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(firstName)}+${encodeURIComponent(lastName)}&background=3390ec&color=fff`,
        online: true,
        lastSeen: Date.now(),
        verified: false
      };
      
      await setDoc(doc(db, 'users', fbUser.uid), userData);
    } catch (err: any) {
      handleError(err);
    }
  };

  const BackButton = () => (
    <button 
      type="button"
      onClick={() => {
        if (step === 'choice') setStep('welcome');
        else if (step === 'login') setStep('choice');
        else if (step === 'register_creds') setStep('choice');
        else if (step === 'register_username') setStep('register_creds');
        else if (step === 'register_profile') setStep('register_username');
        setError(null);
      }}
      className="absolute left-6 top-6 text-gray-400 hover:text-blue-500 transition-colors p-2"
    >
      <i className="fa-solid fa-arrow-left text-xl"></i>
    </button>
  );

  return (
    <div className="auth-container">
      <div className="auth-box relative animate-slide-up">
        {step !== 'welcome' && <BackButton />}

        {step === 'welcome' && (
          <div className="text-center py-4">
            <div className="auth-logo-circle">
              <i className="fa-solid fa-bolt-lightning"></i>
            </div>
            <h1 className="text-3xl font-black text-gray-900 mb-1">MeganNait</h1>
            <div className="space-y-1 mb-10 px-2">
              <p className="text-blue-600 font-black text-[10px] uppercase tracking-[0.4em]">THE COMMUNICATION</p>
              <p className="text-gray-500 text-[13px] font-medium leading-relaxed">
                Безопасный. Быстрый. Бесплатный.
              </p>
            </div>
            <button 
              onClick={() => setStep('choice')}
              className="w-full bg-[#3390ec] text-white py-4 rounded-xl font-bold uppercase tracking-widest text-sm shadow-xl hover:shadow-blue-500/30 active:scale-95 transition-all"
            >
              Продолжить
            </button>
          </div>
        )}

        {step === 'choice' && (
          <div className="text-center py-4">
            <h2 className="text-xl font-bold mb-8">У вас уже есть аккаунт?</h2>
            <div className="space-y-4">
              <button 
                onClick={() => setStep('login')}
                className="w-full bg-[#3390ec] text-white py-4 rounded-xl font-bold uppercase tracking-widest text-sm transition-all"
              >
                Да, войти
              </button>
              <button 
                onClick={() => setStep('register_creds')}
                className="w-full bg-gray-100 text-gray-700 py-4 rounded-xl font-bold uppercase tracking-widest text-sm transition-all"
              >
                Нет, создать
              </button>
            </div>
          </div>
        )}

        {step === 'login' && (
          <form onSubmit={handleLogin} className="space-y-5 pt-8">
            <h2 className="text-2xl font-black text-center mb-6">Вход</h2>
            <div className="space-y-4">
              <input 
                type="email" placeholder="Электронная почта"
                className="w-full p-4 border-2 border-gray-100 rounded-xl outline-none focus:border-blue-500 transition-all font-medium"
                value={email} onChange={e => setEmail(e.target.value)}
              />
              <input 
                type="password" placeholder="Пароль"
                className="w-full p-4 border-2 border-gray-100 rounded-xl outline-none focus:border-blue-500 transition-all font-medium"
                value={password} onChange={e => setPassword(e.target.value)}
              />
            </div>
            {error && <div className="text-red-500 text-[11px] text-center font-bold animate-fade-in bg-red-50 p-3 rounded-lg border border-red-100 leading-tight">{error}</div>}
            <button 
              type="submit" disabled={loading}
              className="w-full bg-[#3390ec] text-white py-4 rounded-xl font-bold uppercase tracking-widest text-sm shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              {loading ? <i className="fas fa-spinner fa-spin"></i> : 'Войти'}
            </button>
          </form>
        )}

        {step === 'register_creds' && (
          <div className="space-y-5 pt-8">
            <h2 className="text-2xl font-black text-center mb-6">Регистрация</h2>
            <div className="space-y-4">
              <input 
                type="email" placeholder="Электронная почта"
                className="w-full p-4 border-2 border-gray-100 rounded-xl outline-none focus:border-blue-500 transition-all font-medium"
                value={email} onChange={e => setEmail(e.target.value)}
              />
              <input 
                type="password" placeholder="Пароль"
                className="w-full p-4 border-2 border-gray-100 rounded-xl outline-none focus:border-blue-500 transition-all font-medium"
                value={password} onChange={e => setPassword(e.target.value)}
              />
              <input 
                type="password" placeholder="Подтвердите пароль"
                className="w-full p-4 border-2 border-gray-100 rounded-xl outline-none focus:border-blue-500 transition-all font-medium"
                value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
              />
            </div>
            {error && <div className="text-red-500 text-[11px] text-center font-bold animate-fade-in bg-red-50 p-3 rounded-lg border border-red-100 leading-tight">{error}</div>}
            <button 
              onClick={nextRegisterStep}
              className="w-full bg-[#3390ec] text-white py-4 rounded-xl font-bold uppercase tracking-widest text-sm shadow-lg active:scale-95 transition-all"
            >
              Далее
            </button>
          </div>
        )}

        {step === 'register_username' && (
          <div className="space-y-5 pt-8">
            <h2 className="text-2xl font-black text-center mb-2">Юзернейм</h2>
            <p className="text-xs text-center text-gray-400 mb-6">Ваш уникальный идентификатор для поиска</p>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500 font-bold">@</span>
              <input 
                type="text" placeholder="username"
                className="w-full p-4 pl-10 border-2 border-gray-100 rounded-xl outline-none focus:border-blue-500 transition-all font-medium"
                value={usernameHandle} onChange={e => setUsernameHandle(e.target.value)}
              />
            </div>
            {error && <div className="text-red-500 text-[11px] text-center font-bold animate-fade-in bg-red-50 p-3 rounded-lg border border-red-100 leading-tight">{error}</div>}
            <button 
              onClick={nextRegisterStep}
              className="w-full bg-[#3390ec] text-white py-4 rounded-xl font-bold uppercase tracking-widest text-sm shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              {loading ? <i className="fas fa-spinner fa-spin"></i> : 'Далее'}
            </button>
          </div>
        )}

        {step === 'register_profile' && (
          <form onSubmit={finishRegistration} className="space-y-5 pt-8">
            <h2 className="text-2xl font-black text-center mb-6">О себе</h2>
            <div className="space-y-4">
              <input 
                type="text" placeholder="Имя"
                className="w-full p-4 border-2 border-gray-100 rounded-xl outline-none focus:border-blue-500 transition-all font-medium"
                value={firstName} onChange={e => setFirstName(e.target.value)}
              />
              <input 
                type="text" placeholder="Фамилия (необязательно)"
                className="w-full p-4 border-2 border-gray-100 rounded-xl outline-none focus:border-blue-500 transition-all font-medium"
                value={lastName} onChange={e => setLastName(e.target.value)}
              />
            </div>
            {error && <div className="text-red-500 text-[11px] text-center font-bold animate-fade-in bg-red-50 p-3 rounded-lg border border-red-100 leading-tight">{error}</div>}
            <button 
              type="submit" disabled={loading}
              className="w-full bg-[#3390ec] text-white py-4 rounded-xl font-bold uppercase tracking-widest text-sm shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              {loading ? <i className="fas fa-spinner fa-spin"></i> : 'Завершить'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default Auth;
