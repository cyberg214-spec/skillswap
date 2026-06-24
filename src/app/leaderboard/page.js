"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { useRouter } from "next/navigation";

export default function Leaderboard() {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [myUid, setMyUid] = useState(null);
  const [myStreak, setMyStreak] = useState(0);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("sessions");

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (!firebaseUser) { router.push("/"); return; }
      setMyUid(firebaseUser.uid);

      try {
        // Load all users
        const usersSnap = await getDocs(collection(db, "users"));
        const allUsers = [];
        usersSnap.forEach(d => allUsers.push({ uid: d.id, ...d.data() }));

        // Load all sessions — using correct field names from your Firestore
        let allSessions = [];
        try {
          const sessionsSnap = await getDocs(collection(db, "sessions"));
          allSessions = sessionsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        } catch {
          // sessions collection might be empty or missing — that's fine
          allSessions = [];
        }

        // Calculate streak for each user based on YOUR field names:
        // - participants: array of uids ✅
        // - date: "YYYY-MM-DD" string ✅  
        // - status: "scheduled" or "completed" ✅
        const withStreaks = allUsers.map(u => {
          const streak = calculateStreak(u.uid, allSessions);
          return { ...u, streak };
        });

        // Sort by score
        const scored = withStreaks.map(u => ({
          ...u,
          score: Math.round(
            (u.sessionsCompleted || 0) * 0.6 +
            (u.rating || 0) * 0.4 * 10
          )
        }));

        scored.sort((a, b) => b.score - a.score);
        setUsers(scored);

        const me = scored.find(u => u.uid === firebaseUser.uid);
        if (me) setMyStreak(me.streak || 0);

      } catch (err) {
        console.error("Leaderboard error:", err);
      }

      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Calculate consecutive week streak
  // Uses "date" field (your format) and "participants" array
  function calculateStreak(uid, allSessions) {
    // Include all sessions this user is part of (scheduled or completed)
    const userSessions = allSessions.filter(s =>
      Array.isArray(s.participants) &&
      s.participants.includes(uid) &&
      s.date // must have a date field
    );

    if (userSessions.length === 0) return 0;

    // Get week key from date string "YYYY-MM-DD" or ISO string
    function getWeekKey(dateStr) {
      try {
        const d = new Date(dateStr);
        if (isNaN(d)) return null;
        const startOfYear = new Date(d.getFullYear(), 0, 1);
        const week = Math.floor((d - startOfYear) / (7 * 24 * 60 * 60 * 1000));
        return `${d.getFullYear()}-${week}`;
      } catch {
        return null;
      }
    }

    const weekSet = new Set(
      userSessions
        .map(s => getWeekKey(s.date))
        .filter(Boolean)
    );

    // Count consecutive weeks going back from now
    let streak = 0;
    const checkDate = new Date();
    for (let i = 0; i < 52; i++) {
      const key = getWeekKey(checkDate.toISOString());
      if (weekSet.has(key)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 7);
      } else {
        break;
      }
    }

    return streak;
  }

  function getStreakLabel(streak) {
    if (!streak || streak === 0) return null;
    if (streak >= 8) return { label: `🔥 ${streak}w`, color: "bg-red-100 text-red-600" };
    if (streak >= 4) return { label: `🔥 ${streak}w`, color: "bg-orange-100 text-orange-600" };
    return { label: `🔥 ${streak}w`, color: "bg-yellow-100 text-yellow-600" };
  }

  function getMedal(index) {
    if (index === 0) return "🥇";
    if (index === 1) return "🥈";
    if (index === 2) return "🥉";
    return `#${index + 1}`;
  }

  function getRankColor(index) {
    if (index === 0) return "bg-yellow-50 border-yellow-200";
    if (index === 1) return "bg-gray-50 border-gray-200";
    if (index === 2) return "bg-orange-50 border-orange-200";
    return "bg-white border-gray-100";
  }

  const sortedBySessions = [...users].sort((a, b) => (b.sessionsCompleted || 0) - (a.sessionsCompleted || 0));
  const sortedByRating = [...users].sort((a, b) => (b.rating || 0) - (a.rating || 0));
  const sortedByStreak = [...users].sort((a, b) => (b.streak || 0) - (a.streak || 0));

  const displayUsers = tab === "sessions"
    ? sortedBySessions
    : tab === "rating"
    ? sortedByRating
    : sortedByStreak;

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-indigo-600 animate-pulse text-lg">Loading leaderboard...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Navbar */}
      <nav className="bg-white shadow-sm px-6 py-4 flex items-center justify-between">
        <div onClick={() => router.push("/dashboard")} className="text-2xl font-bold text-indigo-700 cursor-pointer">
          🔁 SkillSwap
        </div>
        <div className="flex gap-4 text-sm font-medium text-gray-500">
          <button onClick={() => router.push("/dashboard")} className="hover:text-indigo-600">Dashboard</button>
          <button onClick={() => router.push("/discover")} className="hover:text-indigo-600">Discover</button>
          <button onClick={() => router.push("/chat")} className="hover:text-indigo-600">Chat</button>
          <button onClick={() => router.push("/sessions")} className="hover:text-indigo-600">Sessions</button>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-10 flex flex-col gap-6">

        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-800">🏆 Leaderboard</h1>
          <p className="text-gray-400 text-sm mt-2">Top contributors in the SkillSwap community</p>
        </div>

        {/* My streak banner */}
        {myStreak > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-2xl px-5 py-4 flex items-center gap-3">
            <span className="text-3xl">🔥</span>
            <div>
              <p className="font-semibold text-orange-700">You're on a {myStreak}-week streak!</p>
              <p className="text-orange-500 text-xs mt-0.5">Complete a session this week to keep it going</p>
            </div>
          </div>
        )}

        {/* Top 3 Podium */}
        {displayUsers.length >= 3 && (
          <div className="flex items-end justify-center gap-4 py-6">

            {/* 2nd */}
            <div className="flex flex-col items-center gap-2">
              <div className="w-14 h-14 rounded-full bg-gray-200 flex items-center justify-center text-gray-700 font-bold text-xl border-4 border-gray-300 overflow-hidden">
                {displayUsers[1]?.photoBase64
                  ? <img src={displayUsers[1].photoBase64} className="w-full h-full object-cover" />
                  : displayUsers[1]?.name?.charAt(0)}
              </div>
              <div className="text-center">
                <div className="text-sm font-semibold text-gray-700">{displayUsers[1]?.name?.split(" ")[0]}</div>
                <div className="text-xs text-gray-400">
                  {tab === "streak" ? `${displayUsers[1]?.streak || 0}w` : tab === "rating" ? `⭐ ${displayUsers[1]?.rating || 0}` : `${displayUsers[1]?.sessionsCompleted || 0} sessions`}
                </div>
              </div>
              <div className="bg-gray-200 w-20 h-16 rounded-t-xl flex items-center justify-center text-2xl">🥈</div>
            </div>

            {/* 1st */}
            <div className="flex flex-col items-center gap-2">
              <div className="text-2xl">👑</div>
              <div className="w-16 h-16 rounded-full bg-yellow-200 flex items-center justify-center text-yellow-700 font-bold text-2xl border-4 border-yellow-400 overflow-hidden">
                {displayUsers[0]?.photoBase64
                  ? <img src={displayUsers[0].photoBase64} className="w-full h-full object-cover" />
                  : displayUsers[0]?.name?.charAt(0)}
              </div>
              <div className="text-center">
                <div className="text-sm font-bold text-gray-800">{displayUsers[0]?.name?.split(" ")[0]}</div>
                <div className="text-xs text-gray-400">
                  {tab === "streak" ? `${displayUsers[0]?.streak || 0}w` : tab === "rating" ? `⭐ ${displayUsers[0]?.rating || 0}` : `${displayUsers[0]?.sessionsCompleted || 0} sessions`}
                </div>
              </div>
              <div className="bg-yellow-300 w-20 h-24 rounded-t-xl flex items-center justify-center text-2xl">🥇</div>
            </div>

            {/* 3rd */}
            <div className="flex flex-col items-center gap-2">
              <div className="w-14 h-14 rounded-full bg-orange-100 flex items-center justify-center text-orange-700 font-bold text-xl border-4 border-orange-300 overflow-hidden">
                {displayUsers[2]?.photoBase64
                  ? <img src={displayUsers[2].photoBase64} className="w-full h-full object-cover" />
                  : displayUsers[2]?.name?.charAt(0)}
              </div>
              <div className="text-center">
                <div className="text-sm font-semibold text-gray-700">{displayUsers[2]?.name?.split(" ")[0]}</div>
                <div className="text-xs text-gray-400">
                  {tab === "streak" ? `${displayUsers[2]?.streak || 0}w` : tab === "rating" ? `⭐ ${displayUsers[2]?.rating || 0}` : `${displayUsers[2]?.sessionsCompleted || 0} sessions`}
                </div>
              </div>
              <div className="bg-orange-200 w-20 h-12 rounded-t-xl flex items-center justify-center text-2xl">🥉</div>
            </div>

          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 bg-white rounded-xl p-1 shadow-sm w-fit mx-auto">
          <button
            onClick={() => setTab("sessions")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${tab === "sessions" ? "bg-indigo-600 text-white" : "text-gray-500 hover:text-indigo-600"}`}
          >
            By Sessions
          </button>
          <button
            onClick={() => setTab("rating")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${tab === "rating" ? "bg-yellow-500 text-white" : "text-gray-500 hover:text-yellow-600"}`}
          >
            By Rating
          </button>
          <button
            onClick={() => setTab("streak")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${tab === "streak" ? "bg-orange-500 text-white" : "text-gray-500 hover:text-orange-600"}`}
          >
            🔥 Streaks
          </button>
        </div>

        {/* Full List */}
        <div className="flex flex-col gap-3">
          {displayUsers.map((user, index) => {
            const streakInfo = getStreakLabel(user.streak);
            return (
              <div
                key={user.uid}
                className={`rounded-2xl border p-4 flex items-center gap-4 transition ${getRankColor(index)} ${
                  user.uid === myUid ? "ring-2 ring-indigo-400" : ""
                }`}
              >
                <div className="text-2xl w-10 text-center font-bold">{getMedal(index)}</div>

                <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-lg flex-shrink-0 overflow-hidden">
                  {user.photoBase64
                    ? <img src={user.photoBase64} alt={user.name} className="w-full h-full object-cover" />
                    : user.name?.charAt(0)}
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-800">{user.name}</span>
                    {user.uid === myUid && (
                      <span className="text-xs bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full">You</span>
                    )}
                    {streakInfo && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${streakInfo.color}`}>
                        {streakInfo.label}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">{user.college}</div>
                  {user.badges?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {user.badges.map(badge => (
                        <span key={badge} className="text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full">
                          🏅 {badge}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="text-right flex-shrink-0">
                  <div className="text-lg font-bold text-indigo-600">
                    {tab === "streak"
                      ? <>{user.streak || 0}<span className="text-xs font-normal text-gray-400 ml-1">weeks</span></>
                      : <>{user.sessionsCompleted || 0}<span className="text-xs font-normal text-gray-400 ml-1">sessions</span></>
                    }
                  </div>
                  <div className="text-sm text-yellow-500 font-medium">
                    ⭐ {user.rating > 0 ? user.rating : "New"}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Your Rank */}
        {myUid && displayUsers.length > 0 && (
          <div className="bg-indigo-600 rounded-2xl p-4 text-white text-center">
            <p className="text-sm text-indigo-200">Your rank</p>
            <p className="text-3xl font-bold mt-1">
              #{displayUsers.findIndex(u => u.uid === myUid) + 1}
            </p>
            <p className="text-indigo-200 text-sm mt-1">Complete more sessions to climb higher! 🚀</p>
          </div>
        )}

      </div>
    </div>
  );
}