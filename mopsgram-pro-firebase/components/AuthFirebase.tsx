// components/AuthFirebase.tsx
import React, { useState } from 'react';
import { User } from '../types';
import { registerUser, loginUser } from '../services/firebaseService';

interface AuthProps {
  onComplete: (user: User) => void;
}

const AuthFirebase: React.FC<AuthProps> = ({ onComplete }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async () => {
    setError(null);
    
    if (isLogin) {
      // Validation for login
      if (!email || !password) {
        return setError('Заполните все поля');
      }
    } else {
      // Validation for registration
      if (!email || !password || !username) {
        return setError('Заполните все поля');
      }
      if (password.length < 6) {
        return setError('Пароль должен быть минимум 6 символов');
      }
      if (username.length < 2) {
        return setError('Имя должно быть минимум 2 символа');
      }
    }

    setIsLoading(true);

    try {
      if (isLogin) {
        const user = await loginUser(email, password);
        onComplete(user);
      } else {
        const usernameHandle = '@' + username.toLowerCase().replace(/\s+/g, '');
        const user = await registerUser(email, password, {
          username,
          username_handle: usernameHandle,
          bio: bio || 'Hey! Я использую Mopsgram 🐶'
        });
        onComplete(user);
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      if (err.code === 'auth/user-not-found') {
        setError('Пользователь не найден');
      } else if (err.code === 'auth/wrong-password') {
        setError('Неверный пароль');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('Этот email уже занят');
      } else if (err.code === 'auth/weak-password') {
        setError('Слишком слабый пароль');
      } else if (err.code === 'auth/invalid-email') {
        setError('Неверный формат email');
      } else {
        setError(err.message || 'Произошла ошибка');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen w-full bg-gradient-to-br from-[#2481cc] via-[#1e5a8e] to-[#0e1621] text-white flex flex-col items-center justify-center p-6 overflow-y-auto">
      <div className="w-full max-w-sm animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-24 h-24 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl border border-white/20">
            <i className="fa-solid fa-dog text-5xl text-white"></i>
          </div>
          <h1 className="text-4xl font-bold mb-2">Mopsgram Pro</h1>
          <p className="text-white/70">
            {isLogin ? 'Войдите в свой аккаунт' : 'Создайте новый аккаунт'}
          </p>
        </div>

        {/* Form */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 space-y-4 border border-white/20 shadow-2xl">
          {!isLogin && (
            <div>
              <label className="text-xs font-bold text-white/70 mb-2 block uppercase tracking-wider">
                Имя
              </label>
              <input
                type="text"
                placeholder="Ваше имя"
                className="w-full bg-white/10 backdrop-blur-sm p-4 rounded-xl outline-none border border-white/20 focus:border-white/40 placeholder-white/40"
                value={username}
                onChange={e => setUsername(e.target.value)}
                disabled={isLoading}
              />
            </div>
          )}

          <div>
            <label className="text-xs font-bold text-white/70 mb-2 block uppercase tracking-wider">
              Email
            </label>
            <input
              type="email"
              placeholder="example@mail.com"
              className="w-full bg-white/10 backdrop-blur-sm p-4 rounded-xl outline-none border border-white/20 focus:border-white/40 placeholder-white/40"
              value={email}
              onChange={e => setEmail(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="text-xs font-bold text-white/70 mb-2 block uppercase tracking-wider">
              Пароль
            </label>
            <input
              type="password"
              placeholder="••••••"
              className="w-full bg-white/10 backdrop-blur-sm p-4 rounded-xl outline-none border border-white/20 focus:border-white/40 placeholder-white/40"
              value={password}
              onChange={e => setPassword(e.target.value)}
              disabled={isLoading}
              onKeyDown={e => e.key === 'Enter' && handleAuth()}
            />
          </div>

          {!isLogin && (
            <div>
              <label className="text-xs font-bold text-white/70 mb-2 block uppercase tracking-wider">
                О себе (опционально)
              </label>
              <textarea
                placeholder="Пару слов о себе..."
                className="w-full bg-white/10 backdrop-blur-sm p-4 rounded-xl outline-none border border-white/20 focus:border-white/40 placeholder-white/40 h-20 resize-none"
                value={bio}
                onChange={e => setBio(e.target.value)}
                disabled={isLoading}
              />
            </div>
          )}

          {error && (
            <div className="bg-red-500/20 backdrop-blur-sm border border-red-500/40 text-red-100 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          <button
            onClick={handleAuth}
            disabled={isLoading}
            className="w-full bg-white text-[#2481cc] py-4 rounded-xl font-bold hover:bg-white/90 active:scale-95 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <i className="fa-solid fa-circle-notch animate-spin"></i>
                <span>Загрузка...</span>
              </>
            ) : (
              isLogin ? 'ВОЙТИ' : 'ЗАРЕГИСТРИРОВАТЬСЯ'
            )}
          </button>

          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError(null);
            }}
            disabled={isLoading}
            className="w-full text-white/70 hover:text-white py-2 text-sm transition-colors"
          >
            {isLogin ? 'Нет аккаунта? Зарегистрироваться' : 'Уже есть аккаунт? Войти'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthFirebase;
