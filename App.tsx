
import React, { useState, useEffect, useRef } from 'react';
import Auth from './components/Auth';
import Messenger from './components/Messenger';
import { User } from './types';
import { auth, db } from './services/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);
  const lastStatusUpdate = useRef<number>(0);

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    const updateStatus = async (isOnline: boolean) => {
      const fbUser = auth.currentUser;
      const now = Date.now();
      
      // Не обновляем статус чаще чем раз в 30 секунд, если это не уход в оффлайн
      if (isOnline && now - lastStatusUpdate.current < 30000) return;
      
      if (fbUser) {
        try {
          lastStatusUpdate.current = now;
          await updateDoc(doc(db, 'users', fbUser.uid), {
            online: isOnline,
            lastSeen: now
          });
        } catch (e) {
          console.warn("Status sync failed", e);
        }
      }
    };

    const handleActivity = () => updateStatus(true);
    const handleInactivity = () => updateStatus(false);

    window.addEventListener('focus', handleActivity);
    window.addEventListener('blur', handleInactivity);
    window.addEventListener('beforeunload', handleInactivity);
    
    const handleVisibility = () => {
      updateStatus(document.visibilityState === 'visible');
    };
    document.addEventListener('visibilitychange', handleVisibility);

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      try {
        if (fbUser) {
          const userDoc = await getDoc(doc(db, 'users', fbUser.uid));
          if (userDoc.exists()) {
            const userData = { id: fbUser.uid, ...userDoc.data() } as User;
            setUser(userData);
            updateStatus(true);
          }
        } else {
          setUser(null);
        }
        setInitError(null);
      } catch (err: any) {
        console.error("Initialization Error:", err);
        setInitError(err.message);
      } finally {
        // Небольшая задержка для плавного исчезновения лоадера
        setTimeout(() => setIsInitializing(false), 200);
      }
    });

    return () => {
      unsubscribe();
      window.removeEventListener('focus', handleActivity);
      window.removeEventListener('blur', handleInactivity);
      window.removeEventListener('beforeunload', handleInactivity);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  const handleLogout = async () => {
    if (user) {
      try {
        await updateDoc(doc(db, 'users', user.id), {
          online: false,
          lastSeen: Date.now()
        });
      } catch (e) {}
    }
    await signOut(auth);
    setUser(null);
  };

  if (isInitializing) {
    return (
      <div className="h-[100dvh] w-full bg-[#0b0f14] flex items-center justify-center animate-fade-in">
        <div className="flex flex-col items-center">
          <div className="w-10 h-10 border-2 border-blue-500/10 border-t-blue-500 rounded-full animate-spin mb-6"></div>
          <p className="text-slate-500 font-bold tracking-[0.4em] text-[9px] uppercase opacity-50">MeganNait OS</p>
        </div>
      </div>
    );
  }

  if (initError) {
    return (
      <div className="h-[100dvh] w-full bg-[#0b0f14] flex items-center justify-center p-6 text-center">
        <div className="max-w-md bg-[#17212b] p-8 rounded-3xl border border-red-500/20 shadow-2xl">
          <i className="fa-solid fa-triangle-exclamation text-red-500 text-4xl mb-4"></i>
          <h2 className="text-white font-bold text-xl mb-2">Ошибка подключения</h2>
          <p className="text-slate-400 text-sm mb-6 leading-relaxed">{initError}</p>
          <button onClick={() => window.location.reload()} className="w-full bg-blue-500 text-white py-3 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-blue-600 transition-all">Повторить</button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] w-full overflow-hidden select-none bg-[#0b0f14]">
      {user ? <Messenger user={user} onLogout={handleLogout} /> : <Auth onComplete={() => {}} />}
    </div>
  );
};

export default App;
