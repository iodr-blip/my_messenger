
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCODVVoYIcq-IervMNj3lK7bGiNAiWZq3k",
  authDomain: "my-messenger-zw.firebaseapp.com",
  projectId: "my-messenger-zw",
  storageBucket: "my-messenger-zw.appspot.com",
  messagingSenderId: "365170395403",
  appId: "1:365170395403:web:202be9b3e783be28fc7a0e",
  measurementId: "G-JE0ZN6MGGE"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
