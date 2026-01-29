// services/firebaseService.ts
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { getDatabase, ref, set, update, onValue, push, remove, onDisconnect, get } from 'firebase/database';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { User, Message, Chat } from '../types';

const firebaseConfig = {
  apiKey: "AIzaSyCODVVoYIcq-IervMNj3lK7bGiNAiWZq3k",
  authDomain: "my-messenger-zw.firebaseapp.com",
  databaseURL: "https://my-messenger-zw-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "my-messenger-zw",
  storageBucket: "my-messenger-zw.firebasestorage.app",
  messagingSenderId: "365170395403",
  appId: "1:365170395403:web:202be9b3e783be28fc7a0e"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);
const storage = getStorage(app);

// Auth Functions
export const registerUser = async (email: string, password: string, userData: Partial<User>) => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const userId = userCredential.user.uid;
  
  const newUser: User = {
    id: userId,
    username: userData.username || 'User',
    username_handle: userData.username_handle || '@user',
    email: email,
    avatarUrl: userData.avatarUrl,
    bio: userData.bio || 'Hey! Я использую Mopsgram 🐶',
    online: true,
    lastSeen: Date.now()
  };
  
  await set(ref(database, `users/${userId}`), newUser);
  
  // Setup disconnect handler
  const userStatusRef = ref(database, `users/${userId}`);
  onDisconnect(userStatusRef).update({
    online: false,
    lastSeen: Date.now()
  });
  
  return newUser;
};

export const loginUser = async (email: string, password: string) => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  const userId = userCredential.user.uid;
  
  // Update online status
  await update(ref(database, `users/${userId}`), {
    online: true,
    lastSeen: Date.now()
  });
  
  // Setup disconnect handler
  const userStatusRef = ref(database, `users/${userId}`);
  onDisconnect(userStatusRef).update({
    online: false,
    lastSeen: Date.now()
  });
  
  // Get user data
  const userSnapshot = await get(ref(database, `users/${userId}`));
  return userSnapshot.val() as User;
};

export const logoutUser = async () => {
  if (auth.currentUser) {
    await update(ref(database, `users/${auth.currentUser.uid}`), {
      online: false,
      lastSeen: Date.now()
    });
    await signOut(auth);
  }
};

export const onAuthChange = (callback: (user: FirebaseUser | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

export const getCurrentUser = () => auth.currentUser;

// User Functions
export const getUserData = async (userId: string): Promise<User | null> => {
  const snapshot = await get(ref(database, `users/${userId}`));
  return snapshot.val();
};

export const updateUserProfile = async (userId: string, updates: Partial<User>) => {
  await update(ref(database, `users/${userId}`), updates);
};

export const listenToUser = (userId: string, callback: (user: User | null) => void) => {
  return onValue(ref(database, `users/${userId}`), (snapshot) => {
    callback(snapshot.val());
  });
};

export const listenToAllUsers = (callback: (users: User[]) => void) => {
  return onValue(ref(database, 'users'), (snapshot) => {
    const usersData = snapshot.val();
    const usersList: User[] = [];
    
    for (let id in usersData) {
      usersList.push({ ...usersData[id], id });
    }
    
    callback(usersList);
  });
};

// Message Functions
export const sendMessage = async (chatId: string, message: Partial<Message>) => {
  const messagesRef = ref(database, `chats/${chatId}/messages`);
  const newMessageRef = push(messagesRef);
  
  const fullMessage: Message = {
    id: newMessageRef.key!,
    senderId: message.senderId!,
    text: message.text || '',
    timestamp: Date.now(),
    status: 'sent',
    imageUrl: message.imageUrl,
    fileUrl: message.fileUrl,
    fileName: message.fileName,
    fileSize: message.fileSize,
    audioUrl: message.audioUrl,
    duration: message.duration,
    edited: false
  };
  
  await set(newMessageRef, fullMessage);
  return fullMessage;
};

export const editMessage = async (chatId: string, messageId: string, newText: string) => {
  await update(ref(database, `chats/${chatId}/messages/${messageId}`), {
    text: newText,
    edited: true
  });
};

export const deleteMessage = async (chatId: string, messageId: string) => {
  await remove(ref(database, `chats/${chatId}/messages/${messageId}`));
};

export const listenToMessages = (chatId: string, callback: (messages: Message[]) => void) => {
  return onValue(ref(database, `chats/${chatId}/messages`), (snapshot) => {
    const messagesData = snapshot.val();
    const messagesList: Message[] = [];
    
    if (messagesData) {
      for (let id in messagesData) {
        messagesList.push({ ...messagesData[id], id });
      }
      messagesList.sort((a, b) => a.timestamp - b.timestamp);
    }
    
    callback(messagesList);
  });
};

// Typing indicator
export const setTyping = async (chatId: string, userId: string, isTyping: boolean) => {
  await set(ref(database, `chats/${chatId}/typing/${userId}`), isTyping);
  
  if (isTyping) {
    // Auto remove after 3 seconds
    setTimeout(async () => {
      await set(ref(database, `chats/${chatId}/typing/${userId}`), false);
    }, 3000);
  }
};

export const listenToTyping = (chatId: string, userId: string, callback: (isTyping: boolean) => void) => {
  return onValue(ref(database, `chats/${chatId}/typing/${userId}`), (snapshot) => {
    callback(snapshot.val() === true);
  });
};

// Storage Functions
export const uploadImage = async (file: File, path: string): Promise<string> => {
  const imageRef = storageRef(storage, path);
  await uploadBytes(imageRef, file);
  return await getDownloadURL(imageRef);
};

export const uploadAvatar = async (userId: string, file: File): Promise<string> => {
  return await uploadImage(file, `avatars/${userId}`);
};

export const uploadChatImage = async (chatId: string, file: File): Promise<string> => {
  const timestamp = Date.now();
  return await uploadImage(file, `chat_images/${chatId}/${timestamp}_${file.name}`);
};

// Chat helpers
export const createChatId = (userId1: string, userId2: string): string => {
  return [userId1, userId2].sort().join('_');
};

export const listenToRecentChats = (currentUserId: string, callback: (chats: any[]) => void) => {
  return onValue(ref(database, 'chats'), (snapshot) => {
    const chatsData = snapshot.val();
    const chatsList: any[] = [];
    
    if (chatsData) {
      for (let chatId in chatsData) {
        if (chatId.includes(currentUserId)) {
          const messages = chatsData[chatId].messages || {};
          const messagesList = Object.values(messages) as Message[];
          
          if (messagesList.length > 0) {
            const lastMessage = messagesList.sort((a, b) => b.timestamp - a.timestamp)[0];
            const otherUserId = chatId.split('_').find(id => id !== currentUserId);
            
            chatsList.push({
              chatId,
              userId: otherUserId,
              lastMessage,
              timestamp: lastMessage.timestamp
            });
          }
        }
      }
      chatsList.sort((a, b) => b.timestamp - a.timestamp);
    }
    
    callback(chatsList);
  });
};

export { auth, database, storage };
