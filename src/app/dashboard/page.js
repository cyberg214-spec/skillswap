"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";

const LEVEL_COLORS = {
  Beginner: "bg-green-100 text-green-700 border-green-300",
  Intermediate: "bg-yellow-100 text-yellow-700 border-yellow-300",
  Expert: "bg-red-100 text-red-700 border-red-300"
};

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (!firebaseUser) { router.push("/"); return; }
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

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <p className="text-indigo-600 text-lg font-medium animate-pulse">
        Loading your dashboard...
      </p>
    </div>
  );

  const avatarSrc = profile?.photoBase64 || user?.photoURL || "";

  // Handle both old (string[]) and new ({skill,level}[]) teach format
  const teachSkills = (profile?.teach || []).map(item =>
    typeof item === "string" ? { skill: item, level: null } : item
  );

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Navbar */}
      <nav className="bg-white shadow-sm px-6 py-4 flex items-center justify-between">
        <div className="text-2xl font-bold text-indigo-700">🔁 SkillSwap</div>
        <div className="flex items-center gap-4">
          <button onClick={() => router.push("/discover")} className="text-sm text-gray-600 hover:text-indigo-600 font-medium transition">Discover</button>
          <button onClick={() => router.push("/requests")} className="text-sm text-gray-600 hover:text-indigo-600 font-medium transition">Requests</button>
          <button onClick={() => router.push("/chat")} className="text-sm text-gray-600 hover:text-indigo-600 font-medium transition">Chat</button>
          <button onClick={() => router.push("/sessions")} className="text-sm text-gray-600 hover:text-indigo-600 font-medium transition">Sessions</button>
          <button onClick={() => router.push("/leaderboard")} className="text-sm text-gray-600 hover:text-indigo-600 font-medium transition">🏆 Leaderboard</button>
          <button onClick={() => router.push("/edit-profile")} className="text-sm text-gray-600 hover:text-indigo-600 font-medium transition">✏️ Edit Profile</button>

          {avatarSrc ? (
            <img
              src={avatarSrc}
              alt="avatar"
              onClick={() => router.push("/edit-profile")}
              className="w-9 h-9 rounded-full border-2 border-indigo-400 cursor-pointer object-cover"
            />
          ) : (
            <div
              onClick={() => router.push("/edit-profile")}
              className="w-9 h-9 rounded-full border-2 border-indigo-400 cursor-pointer bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm"
            >
              {profile?.name?.charAt(0) || "?"}
            </div>
          )}

          <button onClick={handleLogout} className="text-sm text-red-400 hover:text-red-600 font-medium transition">Logout</button>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-10 flex flex-col gap-8">

        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-8 text-white flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">
              Hey, {profile?.name?.split(" ")[0]} 👋
            </h1>
            <p className="text-indigo-200 mt-1 text-sm">{profile?.college}</p>
            <p className="mt-3 text-sm text-indigo-100 max-w-sm">
              {profile?.bio || "Ready to swap some skills today?"}
            </p>
          </div>
          {avatarSrc ? (
            <img src={avatarSrc} alt="avatar" className="w-20 h-20 rounded-full border-4 border-white shadow-lg object-cover" />
          ) : (
            <div className="w-20 h-20 rounded-full border-4 border-white shadow-lg bg-indigo-400 flex items-center justify-center text-white font-bold text-2xl">
              {profile?.name?.charAt(0) || "?"}
            </div>
          )}
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl p-6 shadow-sm flex flex-col items-center gap-1">
            <span className="text-3xl font-bold text-indigo-600">{profile?.sessionsCompleted || 0}</span>
            <span className="text-sm text-gray-400">Sessions Done</span>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm flex flex-col items-center gap-1">
            <span className="text-3xl font-bold text-yellow-500">{profile?.rating || "—"}</span>
            <span className="text-sm text-gray-400">Avg Rating</span>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm flex flex-col items-center gap-1">
            <span className="text-3xl font-bold text-purple-500">{profile?.badges?.length || 0}</span>
            <span className="text-sm text-gray-400">Badges Earned</span>
          </div>
        </div>

        {/* Skills Section */}
        <div className="grid grid-cols-2 gap-4">

          {/* Teaching */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-gray-700">🎓 I Can Teach</h2>
              <button onClick={() => router.push("/edit-profile")} className="text-xs text-indigo-500 hover:underline">Edit</button>
            </div>
            <div className="flex flex-wrap gap-2">
              {teachSkills.map(({ skill, level }) => (
                <span
                  key={skill}
                  className={`px-3 py-1 rounded-full text-xs font-medium border ${
                    level ? LEVEL_COLORS[level] : "bg-indigo-50 text-indigo-700 border-indigo-200"
                  }`}
                >
                  {skill}{level ? ` · ${level}` : ""}
                </span>
              ))}
            </div>
          </div>

          {/* Learning */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-gray-700">📚 I Want to Learn</h2>
              <button onClick={() => router.push("/edit-profile")} className="text-xs text-purple-500 hover:underline">Edit</button>
            </div>
            <div className="flex flex-wrap gap-2">
              {(profile?.learn || []).map(skill => (
                <span key={skill} className="bg-purple-50 text-purple-700 px-3 py-1 rounded-full text-sm font-medium border border-purple-200">
                  {skill}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Badges */}
        {profile?.badges?.length > 0 && (
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-700 mb-3">🏅 My Badges</h2>
            <div className="flex flex-wrap gap-2">
              {profile.badges.map(badge => (
                <span key={badge} className="bg-purple-100 text-purple-700 px-3 py-1.5 rounded-full text-sm font-medium border border-purple-200">
                  🏅 {badge}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-3 gap-4">
          <button onClick={() => router.push("/discover")} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl p-6 text-left transition shadow-sm">
            <div className="text-2xl mb-2">🔍</div>
            <div className="font-semibold text-lg">Discover</div>
            <div className="text-indigo-200 text-sm mt-1">Find skill matches</div>
          </button>

          <button onClick={() => router.push("/requests")} className="bg-purple-600 hover:bg-purple-700 text-white rounded-2xl p-6 text-left transition shadow-sm">
            <div className="text-2xl mb-2">📬</div>
            <div className="font-semibold text-lg">Requests</div>
            <div className="text-purple-200 text-sm mt-1">View your requests</div>
          </button>

          <button onClick={() => router.push("/chat")} className="bg-green-600 hover:bg-green-700 text-white rounded-2xl p-6 text-left transition shadow-sm">
            <div className="text-2xl mb-2">💬</div>
            <div className="font-semibold text-lg">Chats</div>
            <div className="text-green-200 text-sm mt-1">Talk with partners</div>
          </button>

          <button onClick={() => router.push("/leaderboard")} className="bg-yellow-500 hover:bg-yellow-600 text-white rounded-2xl p-6 text-left transition shadow-sm">
            <div className="text-2xl mb-2">🏆</div>
            <div className="font-semibold text-lg">Leaderboard</div>
            <div className="text-yellow-100 text-sm mt-1">See top contributors</div>
          </button>

          <button onClick={() => router.push("/sessions")} className="bg-blue-500 hover:bg-blue-600 text-white rounded-2xl p-6 text-left transition shadow-sm">
            <div className="text-2xl mb-2">📅</div>
            <div className="font-semibold text-lg">Sessions</div>
            <div className="text-blue-100 text-sm mt-1">Schedule & manage</div>
          </button>

          <button onClick={() => router.push("/edit-profile")} className="bg-pink-500 hover:bg-pink-600 text-white rounded-2xl p-6 text-left transition shadow-sm">
            <div className="text-2xl mb-2">✏️</div>
            <div className="font-semibold text-lg">Edit Profile</div>
            <div className="text-pink-100 text-sm mt-1">Update skills & photo</div>
          </button>
        </div>

      </div>
    </div>
  );
}