
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBiF6VrrDYcXzs0H4QutVOr1scsp69Q5eM",
  authDomain: "meganait-messenger.firebaseapp.com",
  projectId: "meganait-messenger",
  storageBucket: "meganait-messenger.firebasestorage.app",
  messagingSenderId: "465724556048",
  appId: "1:465724556048:web:0243b8afebf84c72ff5b95",
  measurementId: "G-MKN60HNX9T"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
