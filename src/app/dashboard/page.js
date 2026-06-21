"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (!firebaseUser) {
        router.push("/");
        return;
      }
      setUser(firebaseUser);

      const docSnap = await getDoc(doc(db, "users", firebaseUser.uid));
      if (docSnap.exists()) {
        setProfile(docSnap.data());
      } else {
        router.push("/profile-setup");
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  async function handleLogout() {
    await signOut(auth);
    router.push("/");
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-indigo-600 text-lg font-medium animate-pulse">
          Loading your dashboard...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Navbar */}
      <nav className="bg-white shadow-sm px-6 py-4 flex items-center justify-between">
        <div className="text-2xl font-bold text-indigo-700">🔁 SkillSwap</div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/discover")}
            className="text-sm text-gray-600 hover:text-indigo-600 font-medium transition"
          >
            Discover
          </button>
          <button
            onClick={() => router.push("/requests")}
            className="text-sm text-gray-600 hover:text-indigo-600 font-medium transition"
          >
            Requests
          </button>
          <button
            onClick={() => router.push("/chat")}
            className="text-sm text-gray-600 hover:text-indigo-600 font-medium transition"
          >
            Chat
          </button>
          <button
            onClick={() => router.push("/sessions")}
            className="text-sm text-gray-600 hover:text-indigo-600 font-medium transition"
          >
            Sessions
          </button>
          <button
            onClick={() => router.push("/leaderboard")}
            className="text-sm text-gray-600 hover:text-indigo-600 font-medium transition"
          >
          Leaderboard
          </button>
          <img
            src={user?.photoURL}
            alt="avatar"
            className="w-9 h-9 rounded-full border-2 border-indigo-400 cursor-pointer"
          />
          <button
            onClick={handleLogout}
            className="text-sm text-red-400 hover:text-red-600 font-medium transition"
          >
            Logout
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-10 flex flex-col gap-8">

        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-8 text-white flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">
              Hey, {profile?.name?.split(" ")[0]} 👋
            </h1>
            <p className="text-indigo-200 mt-1 text-sm">
              {profile?.college}
            </p>
            <p className="mt-3 text-sm text-indigo-100 max-w-sm">
              {profile?.bio || "Ready to swap some skills today?"}
            </p>
          </div>
          <img
            src={user?.photoURL}
            alt="avatar"
            className="w-20 h-20 rounded-full border-4 border-white shadow-lg"
          />
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl p-6 shadow-sm flex flex-col items-center gap-1">
            <span className="text-3xl font-bold text-indigo-600">
              {profile?.sessionsCompleted || 0}
            </span>
            <span className="text-sm text-gray-400">Sessions Done</span>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm flex flex-col items-center gap-1">
            <span className="text-3xl font-bold text-yellow-500">
              {profile?.rating || "—"}
            </span>
            <span className="text-sm text-gray-400">Avg Rating</span>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm flex flex-col items-center gap-1">
            <span className="text-3xl font-bold text-purple-500">
              {profile?.badges?.length || 0}
            </span>
            <span className="text-sm text-gray-400">Badges Earned</span>
          </div>
        </div>

        {/* Skills Section */}
        <div className="grid grid-cols-2 gap-4">

          {/* Teaching */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-700 mb-3">
              🎓 I Can Teach
            </h2>
            <div className="flex flex-wrap gap-2">
              {profile?.teach?.map(skill => (
                <span
                  key={skill}
                  className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-sm font-medium border border-indigo-200"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>

          {/* Learning */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-700 mb-3">
              📚 I Want to Learn
            </h2>
            <div className="flex flex-wrap gap-2">
              {profile?.learn?.map(skill => (
                <span
                  key={skill}
                  className="bg-purple-50 text-purple-700 px-3 py-1 rounded-full text-sm font-medium border border-purple-200"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-3 gap-4">
          <button
            onClick={() => router.push("/discover")}
            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl p-6 text-left transition shadow-sm"
          >
            <div className="text-2xl mb-2">🔍</div>
            <div className="font-semibold text-lg">Discover People</div>
            <div className="text-indigo-200 text-sm mt-1">
              Find people who match your skills
            </div>
          </button>

          <button
            onClick={() => router.push("/requests")}
            className="bg-purple-600 hover:bg-purple-700 text-white rounded-2xl p-6 text-left transition shadow-sm"
          >
            <div className="text-2xl mb-2">📬</div>
            <div className="font-semibold text-lg">My Requests</div>
            <div className="text-purple-200 text-sm mt-1">
              View incoming and sent requests
            </div>
          </button>

          <button
            onClick={() => router.push("/chat")}
            className="bg-green-600 hover:bg-green-700 text-white rounded-2xl p-6 text-left transition shadow-sm"
          >
            <div className="text-2xl mb-2">💬</div>
            <div className="font-semibold text-lg">My Chats</div>
            <div className="text-green-200 text-sm mt-1">
              Talk with your skill partners
            </div>
          </button>
        </div>

      </div>
    </div>
  );
}