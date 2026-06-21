"use client";

import { signInWithPopup } from "firebase/auth";
import { auth, provider, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  async function handleLogin() {
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const userDoc = await getDoc(doc(db, "users", user.uid));

      if (userDoc.exists()) {
        router.push("/dashboard");
      } else {
        router.push("/profile-setup");
      }
    } catch (error) {
      console.error("Login failed:", error);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-800 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-2xl p-10 flex flex-col items-center gap-6 w-full max-w-md">
        <div className="text-4xl font-bold text-indigo-700">🔁 SkillSwap</div>
        <p className="text-gray-500 text-center text-sm">
          Exchange skills. Learn for free. Grow together.
        </p>
        <hr className="w-full border-gray-200" />
        <button
          onClick={handleLogin}
          className="flex items-center gap-3 bg-white border border-gray-300 rounded-xl px-6 py-3 shadow hover:shadow-md hover:bg-gray-50 transition w-full justify-center font-medium text-gray-700"
        >
          <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
          Continue with Google
        </button>
        <p className="text-xs text-gray-400 text-center">
          No money. No courses. Just knowledge exchange.
        </p>
      </div>
    </div>
  );
}