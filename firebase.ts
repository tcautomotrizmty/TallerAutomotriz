
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCVa7_T3XvJlhckk40M934je2ctN7tn60A",
  authDomain: "tcautomotrizmty-e9fee.firebaseapp.com",
  projectId: "tcautomotrizmty-e9fee",
  storageBucket: "tcautomotrizmty-e9fee.firebasestorage.app",
  messagingSenderId: "616397593786",
  appId: "1:616397593786:web:1ecc5076e1b0da73c7f683"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
