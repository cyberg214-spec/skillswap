"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import {
  collection, query, where, onSnapshot,
  addDoc, doc, updateDoc, getDoc
} from "firebase/firestore";
import { useRouter } from "next/navigation";

export default function Sessions() {
  const router = useRouter();
  const [myUid, setMyUid] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [chatRooms, setChatRooms] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedChat, setSelectedChat] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [meetLink, setMeetLink] = useState("");
  const [skill, setSkill] = useState("");
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("upcoming");

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (!firebaseUser) { router.push("/"); return; }
      setMyUid(firebaseUser.uid);

      // Get my sessions
      const q = query(
        collection(db, "sessions"),
        where("participants", "array-contains", firebaseUser.uid)
      );
      onSnapshot(q, (snap) => {
        const data = [];
        snap.forEach(d => data.push({ id: d.id, ...d.data() }));
        data.sort((a, b) => new Date(a.date + " " + a.time) - new Date(b.date + " " + b.time));
        setSessions(data);
        setLoading(false);
      });

      // Get my chat rooms for scheduling
      const chatQ = query(
        collection(db, "chats"),
        where("participants", "array-contains", firebaseUser.uid)
      );
      onSnapshot(chatQ, (snap) => {
        const rooms = [];
        snap.forEach(d => rooms.push({ id: d.id, ...d.data() }));
        setChatRooms(rooms);
      });
    });
    return () => unsubscribe();
  }, []);

  function getOtherPersonName(room) {
    const otherUid = room.participants.find(p => p !== myUid);
    return room.participantNames?.[otherUid] || "Unknown";
  }

  async function scheduleSession() {
    if (!selectedChat || !date || !time || !skill) {
      alert("Please fill all fields!");
      return;
    }

    const room = chatRooms.find(r => r.id === selectedChat);
    const otherUid = room.participants.find(p => p !== myUid);

    await addDoc(collection(db, "sessions"), {
      participants: [myUid, otherUid],
      chatId: selectedChat,
      skill,
      date,
      time,
      meetLink,
      status: "scheduled",
      createdBy: myUid,
      reviewed: [],
      createdAt: new Date().toISOString()
    });

    setShowForm(false);
    setDate("");
    setTime("");
    setMeetLink("");
    setSkill("");
    setSelectedChat("");
    alert("Session scheduled successfully! 🎉");
  }

  async function markComplete(sessionId) {
    await updateDoc(doc(db, "sessions", sessionId), {
      status: "completed"
    });

    // Update sessions completed count
    const userRef = doc(db, "users", myUid);
    const userSnap = await getDoc(userRef);
    const current = userSnap.data().sessionsCompleted || 0;
    await updateDoc(userRef, { sessionsCompleted: current + 1 });
  }

  function isUpcoming(session) {
    const sessionDate = new Date(session.date + " " + session.time);
    return sessionDate >= new Date() && session.status === "scheduled";
  }

  function isPast(session) {
    const sessionDate = new Date(session.date + " " + session.time);
    return sessionDate < new Date() || session.status === "completed";
  }

  function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      weekday: "short", day: "numeric", month: "short", year: "numeric"
    });
  }

  const upcomingSessions = sessions.filter(isUpcoming);
  const pastSessions = sessions.filter(isPast);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-indigo-600 animate-pulse text-lg">Loading sessions...</p>
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
          <button onClick={() => router.push("/discover")} className="hover:text-indigo-600">Discover</button>
          <button onClick={() => router.push("/chat")} className="hover:text-indigo-600">Chat</button>
          <button onClick={() => router.push("/requests")} className="hover:text-indigo-600">Requests</button>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-10 flex flex-col gap-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">My Sessions 📅</h1>
            <p className="text-gray-400 text-sm mt-1">
              Schedule and manage your skill exchange sessions
            </p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700 transition"
          >
            + Schedule Session
          </button>
        </div>

        {/* Schedule Form */}
        {showForm && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col gap-4">
            <h2 className="font-bold text-gray-800 text-lg">📅 New Session</h2>

            {/* Select Partner */}
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-600">Select Partner</label>
              <select
                value={selectedChat}
                onChange={e => setSelectedChat(e.target.value)}
                className="border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                <option value="">-- Choose from your chats --</option>
                {chatRooms.map(room => (
                  <option key={room.id} value={room.id}>
                    {getOtherPersonName(room)}
                  </option>
                ))}
              </select>
            </div>

            {/* Skill */}
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-600">Skill to Exchange</label>
              <input
                value={skill}
                onChange={e => setSkill(e.target.value)}
                placeholder="e.g. Python, UI Design..."
                className="border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>

            {/* Date & Time */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-600">Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-600">Time</label>
                <input
                  type="time"
                  value={time}
                  onChange={e => setTime(e.target.value)}
                  className="border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
            </div>

            {/* Meet Link */}
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-600">
                Google Meet / Zoom Link (optional)
              </label>
              <input
                value={meetLink}
                onChange={e => setMeetLink(e.target.value)}
                placeholder="https://meet.google.com/..."
                className="border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={scheduleSession}
                className="bg-indigo-600 text-white px-6 py-3 rounded-xl text-sm font-medium hover:bg-indigo-700 transition flex-1"
              >
                ✓ Confirm Session
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="border border-gray-300 text-gray-500 px-6 py-3 rounded-xl text-sm font-medium hover:bg-gray-50 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 bg-white rounded-xl p-1 shadow-sm w-fit">
          <button
            onClick={() => setTab("upcoming")}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition ${
              tab === "upcoming"
                ? "bg-indigo-600 text-white"
                : "text-gray-500 hover:text-indigo-600"
            }`}
          >
            Upcoming ({upcomingSessions.length})
          </button>
          <button
            onClick={() => setTab("past")}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition ${
              tab === "past"
                ? "bg-purple-600 text-white"
                : "text-gray-500 hover:text-purple-600"
            }`}
          >
            Past ({pastSessions.length})
          </button>
        </div>

        {/* Upcoming Sessions */}
        {tab === "upcoming" && (
          <div className="flex flex-col gap-4">
            {upcomingSessions.length === 0 ? (
              <div className="text-center py-20 text-gray-400">
                <div className="text-4xl mb-3">📅</div>
                <p>No upcoming sessions</p>
                <p className="text-sm mt-1">Schedule one with your chat partners!</p>
              </div>
            ) : (
              upcomingSessions.map(session => (
                <div
                  key={session.id}
                  className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 flex flex-col gap-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center text-2xl">
                        🎓
                      </div>
                      <div>
                        <div className="font-semibold text-gray-800">{session.skill}</div>
                        <div className="text-xs text-gray-400 mt-0.5">Skill Exchange Session</div>
                      </div>
                    </div>
                    <span className="bg-green-100 text-green-600 text-xs px-3 py-1 rounded-full font-medium">
                      Scheduled
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-50 rounded-xl p-3">
                      <div className="text-xs text-gray-400">Date</div>
                      <div className="font-medium text-gray-700 text-sm mt-0.5">
                        {formatDate(session.date)}
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3">
                      <div className="text-xs text-gray-400">Time</div>
                      <div className="font-medium text-gray-700 text-sm mt-0.5">
                        {session.time}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    {session.meetLink && (
                      <a
                        href={session.meetLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 bg-green-500 hover:bg-green-600 text-white text-center py-2.5 rounded-xl text-sm font-medium transition"
                      >
                        🎥 Join Session
                      </a>
                    )}
                    <button
                      onClick={() => markComplete(session.id)}
                      className="flex-1 border border-gray-300 text-gray-600 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition"
                    >
                      ✓ Mark Complete
                    </button>
                    <button
                      onClick={() => router.push("/review?sessionId=" + session.id)}
                      className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2.5 rounded-xl text-sm font-medium transition"
                    >
                      ⭐ Review
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Past Sessions */}
        {tab === "past" && (
          <div className="flex flex-col gap-4">
            {pastSessions.length === 0 ? (
              <div className="text-center py-20 text-gray-400">
                <div className="text-4xl mb-3">🎓</div>
                <p>No past sessions yet</p>
              </div>
            ) : (
              pastSessions.map(session => (
                <div
                  key={session.id}
                  className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center text-2xl">
                      ✅
                    </div>
                    <div>
                      <div className="font-semibold text-gray-800">{session.skill}</div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {formatDate(session.date)} at {session.time}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 items-center">
                    <span className="bg-purple-100 text-purple-600 text-xs px-3 py-1 rounded-full font-medium">
                      Completed
                    </span>
                    {!session.reviewed?.includes(myUid) && (
                      <button
                        onClick={() => router.push("/review?sessionId=" + session.id)}
                        className="bg-yellow-400 hover:bg-yellow-500 text-white px-4 py-1.5 rounded-xl text-xs font-medium transition"
                      >
                        ⭐ Leave Review
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
