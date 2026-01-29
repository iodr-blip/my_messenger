# 🔥 Firebase Integration для Mopsgram Pro

## Установка зависимостей

```bash
npm install firebase
```

## Шаги интеграции

### 1. Добавь новые файлы в проект

✅ `services/firebaseService.ts` - Создан
✅ `components/AuthFirebase.tsx` - Создан  
✅ `AppFirebase.tsx` - Создан
✅ `components/SidebarFirebase.tsx` - Инструкции для обновления

### 2. Обнови index.tsx

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import AppFirebase from './AppFirebase';  // <- ИЗМЕНЕНО

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppFirebase />  {/* <- ИЗМЕНЕНО */}
  </React.StrictMode>
);
```

### 3. Обнови Sidebar.tsx

Открой `components/Sidebar.tsx` и:

1. Добавь в интерфейс `SidebarProps`:
```tsx
allUsers: User[];  // <- ДОБАВЬ
onChatSelect: (userId: string) => void;  // <- ИЗМЕНИ с chatId на userId
```

2. Добавь state для поиска:
```tsx
const [searchQuery, setSearchQuery] = useState('');
```

3. Обнови input поиска чтобы он обновлял searchQuery:
```tsx
<input 
  value={searchQuery}
  onChange={(e) => setSearchQuery(e.target.value)}
  ...
/>
```

4. Добавь отображение найденных пользователей после списка чатов (код в SidebarFirebase.tsx)

### 4. Обнови package.json

Добавь зависимости:
```json
{
  "dependencies": {
    "react": "^19.2.4",
    "react-dom": "^19.2.4",
    "firebase": "^10.7.1"
  }
}
```

### 5. Запуск

```bash
npm install
npm run dev
```

## ✨ Что теперь работает с Firebase

- ✅ Реальная регистрация и авторизация
- ✅ Синхронизация сообщений в реальном времени
- ✅ Онлайн статусы пользователей
- ✅ Загрузка фото в чат
- ✅ Загрузка аватарок
- ✅ Редактирование профиля
- ✅ Поиск пользователей
- ✅ Индикатор "печатает..."

## 🔧 Настройки Firebase

Конфигурация уже прописана в `firebaseService.ts`, но если нужно изменить:

```tsx
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT.firebasedatabase.app",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

## 📝 Важные изменения

1. **localStorage больше не используется** - всё в Firebase
2. **Auth теперь настоящий** - Email/Password через Firebase Auth
3. **Realtime Database** - сообщения синхронизируются мгновенно
4. **Storage** - фото и файлы загружаются в Firebase Storage

## 🚀 Деплой

После сборки (`npm run build`) можешь задеплоить на:
- Cloudflare Pages
- Vercel
- Netlify
- Firebase Hosting

Готово! 🎉
