import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyB1CsFCGWMAHHUpLNAstBFTKKXM37pP01A",
  authDomain: "skillswap-1bb7c.firebaseapp.com",
  projectId: "skillswap-1bb7c",
  storageBucket: "skillswap-1bb7c.firebasestorage.app",
  messagingSenderId: "191203710367",
  appId: "1:191203710367:web:f565a1ef40dfc2165f59aa"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const db = getFirestore(app);