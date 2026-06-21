"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { collection, getDocs, doc, getDoc, addDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";

export default function Discover() {
  const router = useRouter();
  const [myProfile, setMyProfile] = useState(null);
  const [users, setUsers] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [sentRequests, setSentRequests] = useState([]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (!firebaseUser) { router.push("/"); return; }

      const myDoc = await getDoc(doc(db, "users", firebaseUser.uid));
      const myData = myDoc.data();
      setMyProfile({ ...myData, uid: firebaseUser.uid });

      const snapshot = await getDocs(collection(db, "users"));
      const allUsers = [];
      snapshot.forEach(d => {
        if (d.id !== firebaseUser.uid) allUsers.push(d.data());
      });

      // Smart match scoring
      const scored = allUsers.map(u => {
        let score = 0;
        const teachMatch = u.teach?.some(s => myData.learn?.includes(s));
        const learnMatch = u.learn?.some(s => myData.teach?.includes(s));
        if (teachMatch) score += 50;
        if (learnMatch) score += 50;
        if (u.rating > 0) score += u.rating * 2;
        return { ...u, score };
      });

      scored.sort((a, b) => b.score - a.score);
      setUsers(scored);
      setFiltered(scored);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (search.trim() === "") {
      setFiltered(users);
    } else {
      const q = search.toLowerCase();
      setFiltered(users.filter(u =>
        u.name?.toLowerCase().includes(q) ||
        u.teach?.some(s => s.toLowerCase().includes(q)) ||
        u.learn?.some(s => s.toLowerCase().includes(q))
      ));
    }
  }, [search, users]);

  async function sendRequest(toUser) {
    const from = auth.currentUser;
    await addDoc(collection(db, "requests"), {
      fromUid: from.uid,
      fromName: myProfile.name,
      fromPhoto: from.photoURL,
      toUid: toUser.uid,
      toName: toUser.name,
      status: "pending",
      createdAt: new Date().toISOString()
    });
    setSentRequests(prev => [...prev, toUser.uid]);
  }

  function getMatchLabel(user) {
    const teachMatch = user.teach?.some(s => myProfile?.learn?.includes(s));
    const learnMatch = user.learn?.some(s => myProfile?.teach?.includes(s));
    if (teachMatch && learnMatch) return { label: "Perfect Match 🔥", color: "bg-green-100 text-green-700" };
    if (teachMatch) return { label: "Can Teach You", color: "bg-indigo-100 text-indigo-700" };
    if (learnMatch) return { label: "Wants to Learn From You", color: "bg-purple-100 text-purple-700" };
    return { label: "Community Member", color: "bg-gray-100 text-gray-500" };
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-indigo-600 animate-pulse text-lg">Finding your matches...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Navbar */}
      <nav className="bg-white shadow-sm px-6 py-4 flex items-center justify-between">
        <div
          onClick={() => router.push("/dashboard")}
          className="text-2xl font-bold text-indigo-700 cursor-pointer"
        >
          🔁 SkillSwap
        </div>
        <div className="flex gap-4 text-sm font-medium text-gray-500">
          <button onClick={() => router.push("/dashboard")} className="hover:text-indigo-600">Dashboard</button>
          <button onClick={() => router.push("/requests")} className="hover:text-indigo-600">Requests</button>
          <button onClick={() => router.push("/sessions")} className="hover:text-indigo-600">Sessions</button>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-10 flex flex-col gap-6">

        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Discover People 🔍</h1>
          <p className="text-gray-400 text-sm mt-1">
            Find people who match your skills — sorted by best match first
          </p>
        </div>

        {/* Search */}
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or skill (e.g. Python, React...)"
          className="border border-gray-300 rounded-xl px-4 py-3 text-sm w-full focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />

        {/* User Cards */}
        {filtered.length === 0 ? (
          <p className="text-gray-400 text-center py-20">No users found. Try a different search.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map(user => {
              const match = getMatchLabel(user);
              const alreadySent = sentRequests.includes(user.uid);

              return (
                <div
                  key={user.uid}
                  className="bg-white rounded-2xl shadow-sm p-6 flex flex-col gap-4 border border-gray-100"
                >
                  {/* Top Row */}
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-lg">
                      {user.name?.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-gray-800">{user.name}</div>
                      <div className="text-xs text-gray-400">{user.college}</div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${match.color}`}>
                      {match.label}
                    </span>
                  </div>

                  {/* Skills */}
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-wrap gap-1">
                      <span className="text-xs text-gray-400 mr-1">Teaches:</span>
                      {user.teach?.map(s => (
                        <span key={s} className="bg-indigo-50 text-indigo-600 text-xs px-2 py-0.5 rounded-full">
                          {s}
                        </span>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      <span className="text-xs text-gray-400 mr-1">Wants:</span>
                      {user.learn?.map(s => (
                        <span key={s} className="bg-purple-50 text-purple-600 text-xs px-2 py-0.5 rounded-full">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Bottom Row */}
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-yellow-500 font-medium">
                      {user.rating > 0 ? `⭐ ${user.rating}` : "⭐ New"}
                    </div>
                    <button
                      onClick={() => sendRequest(user)}
                      disabled={alreadySent}
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                        alreadySent
                          ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                          : "bg-indigo-600 text-white hover:bg-indigo-700"
                      }`}
                    >
                      {alreadySent ? "Request Sent ✓" : "Send Request"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}