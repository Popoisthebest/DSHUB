import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAen8SrBB-4446BNQP6onn4Xv__aLQDVVU",
  authDomain: "multi-room-reservation-system.firebaseapp.com",
  projectId: "multi-room-reservation-system",
  storageBucket: "multi-room-reservation-system.firebasestorage.app",
  messagingSenderId: "498301757165",
  appId: "1:498301757165:web:56230ab27bceee46a1cee4",
};

// Firebase 초기화
const app = initializeApp(firebaseConfig);

// Firestore 데이터베이스 초기화
export const db = getFirestore(app);

export default app;
