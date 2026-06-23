"use client";
import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import NotificationBell from "@/components/Notifications";

export default function Dashboard() {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (user) => {
      if (!user) { router.push("/"); return; }
      const docSnap = await getDoc(doc(db, "users", user.uid));
      if (!docSnap.exists()) { router.push("/profile-setup"); return; }
      setUserData({ uid: user.uid, ...docSnap.data() });
      setLoading(false);
    });
    return () => unsub();
  }, [router]);

  async function handleSignOut() {
    await signOut(auth);
    router.push("/");
  }

  function getTeachSkills() {
    const t = userData?.teaching;
    if (!t) return [];
    if (Array.isArray(t) && t.length > 0 && typeof t[0] === "object") return t;
    if (Array.isArray(t)) return t.map((s) => ({ skill: s, level: "Intermediate" }));
    return [];
  }

  function getLevelColor(level) {
    if (level === "Expert") return "bg-red-500/20 text-red-300 border border-red-500/30";
    if (level === "Intermediate") return "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30";
    return "bg-green-500/20 text-green-300 border border-green-500/30";
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl animate-pulse">Loading...</div>
      </div>
    );
  }

  const teachSkills = getTeachSkills();
  const learnSkills = userData?.learning || [];
  const photo = userData?.photoBase64;
  const initial = userData?.name?.charAt(0) || "?";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Navbar */}
      <nav className="bg-white/10 backdrop-blur-sm border-b border-white/20 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <h1 className="text-white font-bold text-xl">⚡ SkillSwap</h1>
          <div className="flex items-center gap-3">
            <NotificationBell />
            <button
              onClick={() => router.push("/edit-profile")}
              className="text-white/70 hover:text-white text-sm transition px-3 py-2 rounded-xl hover:bg-white/10"
            >
              ✏️ Edit Profile
            </button>
            <button
              onClick={handleSignOut}
              className="text-white/70 hover:text-white text-sm transition px-3 py-2 rounded-xl hover:bg-white/10"
            >
              Sign Out
            </button>
            <button onClick={() => router.push("/edit-profile")}>
              {photo ? (
                <img
                  src={photo}
                  alt="Profile"
                  className="w-9 h-9 rounded-full object-cover border-2 border-purple-400 hover:border-pink-400 transition"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm">
                  {initial}
                </div>
              )}
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Welcome banner */}
        <div className="bg-gradient-to-r from-purple-600/40 to-pink-600/40 backdrop-blur-sm rounded-3xl p-6 mb-8 border border-white/20">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push("/edit-profile")}>
              {photo ? (
                <img
                  src={photo}
                  alt="Profile"
                  className="w-16 h-16 rounded-full object-cover border-3 border-white/50 hover:border-purple-400 transition"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-bold text-2xl">
                  {initial}
                </div>
              )}
            </button>
            <div>
              <h2 className="text-white text-2xl font-bold">
                Welcome back, {userData?.name?.split(" ")[0]}! 👋
              </h2>
              <p className="text-white/60 text-sm mt-1">
                {userData?.college} · {teachSkills.length} skills to teach · {learnSkills.length} skills to learn
              </p>
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {[
            { icon: "🔍", label: "Discover", path: "/discover", color: "from-blue-500/20 to-cyan-500/20 border-blue-500/30" },
            { icon: "🤝", label: "Requests", path: "/requests", color: "from-green-500/20 to-emerald-500/20 border-green-500/30" },
            { icon: "💬", label: "Chat", path: "/chat", color: "from-purple-500/20 to-violet-500/20 border-purple-500/30" },
            { icon: "📅", label: "Sessions", path: "/sessions", color: "from-orange-500/20 to-amber-500/20 border-orange-500/30" },
            { icon: "🏆", label: "Leaderboard", path: "/leaderboard", color: "from-yellow-500/20 to-orange-500/20 border-yellow-500/30" },
          ].map((item) => (
            <button
              key={item.path}
              onClick={() => router.push(item.path)}
              className={`bg-gradient-to-br ${item.color} backdrop-blur-sm rounded-2xl p-4 border text-center hover:scale-105 transition-all`}
            >
              <div className="text-3xl mb-2">{item.icon}</div>
              <div className="text-white text-sm font-medium">{item.label}</div>
            </button>
          ))}
        </div>

        {/* Skills grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Teaching */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold text-lg">🎓 I Can Teach</h3>
              <button
                onClick={() => router.push("/edit-profile")}
                className="text-purple-400 text-xs hover:text-purple-300 transition"
              >
                Edit ✏️
              </button>
            </div>
            {teachSkills.length === 0 ? (
              <p className="text-white/40 text-sm">No teaching skills added yet.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {teachSkills.map((s, i) => (
                  <span
                    key={i}
                    className="bg-purple-500/20 text-purple-300 border border-purple-500/30 px-3 py-1.5 rounded-xl text-sm flex items-center gap-1.5"
                  >
                    {s.skill}
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${getLevelColor(s.level)}`}>
                      {s.level}
                    </span>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Learning */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold text-lg">📚 I Want to Learn</h3>
              <button
                onClick={() => router.push("/edit-profile")}
                className="text-purple-400 text-xs hover:text-purple-300 transition"
              >
                Edit ✏️
              </button>
            </div>
            {learnSkills.length === 0 ? (
              <p className="text-white/40 text-sm">No learning goals added yet.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {learnSkills.map((skill, i) => (
                  <span
                    key={i}
                    className="bg-pink-500/20 text-pink-300 border border-pink-500/30 px-3 py-1.5 rounded-xl text-sm"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Bio */}
        {userData?.bio && (
          <div className="mt-6 bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
            <h3 className="text-white font-semibold mb-2">💬 About Me</h3>
            <p className="text-white/70 text-sm leading-relaxed">{userData.bio}</p>
          </div>
        )}
      </div>
    </div>
  );
}