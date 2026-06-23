"use client";
import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import {
  collection, query, where, onSnapshot,
  doc, updateDoc, deleteDoc, getDoc
} from "firebase/firestore";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";

export default function SessionsPage() {
  const [sessions, setSessions] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rescheduling, setRescheduling] = useState(null); // sessionId being rescheduled
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const router = useRouter();
  const showToast = useToast();

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (u) => {
      if (!u) { router.push("/"); return; }
      setUser(u);

      const q = query(
        collection(db, "sessions"),
        where("participants", "array-contains", u.uid)
      );

      const unsubSnap = onSnapshot(q, async (snap) => {
        const raw = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

        // Enrich with partner info
        const enriched = await Promise.all(
          raw.map(async (s) => {
            const partnerId = s.participants.find((p) => p !== u.uid);
            let partnerName = "Unknown";
            let partnerPhoto = null;
            if (partnerId) {
              const pd = await getDoc(doc(db, "users", partnerId));
              if (pd.exists()) {
                partnerName = pd.data().name || "Unknown";
                partnerPhoto = pd.data().photoBase64 || null;
              }
            }
            return { ...s, partnerName, partnerPhoto };
          })
        );

        // Sort: upcoming first, then by date
        enriched.sort((a, b) => {
          if (a.status === "completed" && b.status !== "completed") return 1;
          if (a.status !== "completed" && b.status === "completed") return -1;
          return new Date(a.scheduledAt) - new Date(b.scheduledAt);
        });

        setSessions(enriched);
        setLoading(false);
      });

      return () => unsubSnap();
    });
    return () => unsub();
  }, [router]);

  async function markComplete(sessionId) {
    try {
      await updateDoc(doc(db, "sessions", sessionId), { status: "completed" });
      showToast("Session marked as complete! ✅");
    } catch {
      showToast("Failed to update session", "error");
    }
  }

  async function cancelSession(sessionId) {
    if (!confirm("Are you sure you want to cancel this session?")) return;
    try {
      await deleteDoc(doc(db, "sessions", sessionId));
      showToast("Session cancelled.");
    } catch {
      showToast("Failed to cancel session", "error");
    }
  }

  async function rescheduleSession(sessionId) {
    if (!newDate || !newTime) {
      showToast("Please pick a date and time", "error");
      return;
    }
    const combined = new Date(`${newDate}T${newTime}`);
    if (isNaN(combined)) {
      showToast("Invalid date/time", "error");
      return;
    }
    try {
      await updateDoc(doc(db, "sessions", sessionId), {
        scheduledAt: combined.toISOString(),
        status: "scheduled",
      });
      showToast("Session rescheduled! 📅");
      setRescheduling(null);
      setNewDate("");
      setNewTime("");
    } catch {
      showToast("Failed to reschedule session", "error");
    }
  }

  function formatDate(iso) {
    if (!iso) return "TBD";
    const d = new Date(iso);
    return d.toLocaleString("en-IN", {
      weekday: "short", day: "numeric", month: "short",
      year: "numeric", hour: "2-digit", minute: "2-digit",
    });
  }

  const upcoming = sessions.filter((s) => s.status !== "completed");
  const completed = sessions.filter((s) => s.status === "completed");

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl animate-pulse">Loading sessions...</div>
      </div>
    );
  }

  const SessionCard = ({ session }) => {
    const isRescheduling = rescheduling === session.id;
    const isPast = new Date(session.scheduledAt) < new Date() && session.status !== "completed";

    return (
      <div className={`bg-white/10 backdrop-blur-sm rounded-2xl p-5 border ${
        session.status === "completed"
          ? "border-green-500/30"
          : isPast
          ? "border-red-500/30"
          : "border-white/20"
      }`}>
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          {session.partnerPhoto ? (
            <img
              src={session.partnerPhoto}
              alt={session.partnerName}
              className="w-12 h-12 rounded-full object-cover border-2 border-purple-400"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-lg">
              {session.partnerName?.charAt(0) || "?"}
            </div>
          )}
          <div className="flex-1">
            <p className="text-white font-semibold">{session.partnerName}</p>
            <p className="text-purple-300 text-sm">
              {session.skillTaught ? `Teaching: ${session.skillTaught}` : "Skill exchange"}
            </p>
          </div>
          <span className={`text-xs px-3 py-1 rounded-full font-medium ${
            session.status === "completed"
              ? "bg-green-500/20 text-green-300"
              : isPast
              ? "bg-red-500/20 text-red-300"
              : "bg-blue-500/20 text-blue-300"
          }`}>
            {session.status === "completed" ? "✅ Done" : isPast ? "⚠️ Overdue" : "📅 Upcoming"}
          </span>
        </div>

        {/* Date */}
        <div className="flex items-center gap-2 text-white/70 text-sm mb-3">
          <span>🕐</span>
          <span>{formatDate(session.scheduledAt)}</span>
        </div>

        {/* Notes */}
        {session.notes && (
          <p className="text-white/60 text-sm mb-4 bg-white/5 rounded-xl px-3 py-2">
            📝 {session.notes}
          </p>
        )}

        {/* Reschedule form */}
        {isRescheduling && (
          <div className="mb-4 bg-white/5 rounded-xl p-4 border border-purple-500/30">
            <p className="text-white text-sm font-medium mb-3">📅 Pick a new date & time</p>
            <div className="flex gap-2 mb-3">
              <input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                className="flex-1 bg-white/10 text-white rounded-xl px-3 py-2 text-sm border border-white/20 focus:outline-none focus:border-purple-400"
              />
              <input
                type="time"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                className="flex-1 bg-white/10 text-white rounded-xl px-3 py-2 text-sm border border-white/20 focus:outline-none focus:border-purple-400"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => rescheduleSession(session.id)}
                className="flex-1 bg-purple-500 hover:bg-purple-600 text-white py-2 rounded-xl text-sm font-medium transition"
              >
                Confirm
              </button>
              <button
                onClick={() => { setRescheduling(null); setNewDate(""); setNewTime(""); }}
                className="flex-1 bg-white/10 hover:bg-white/20 text-white py-2 rounded-xl text-sm transition"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Actions */}
        {session.status !== "completed" && (
          <div className="flex gap-2 flex-wrap">
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
              className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2.5 rounded-xl text-sm font-medium transition"
            >
              ✅ Mark Done
            </button>
            <button
              onClick={() => {
                setRescheduling(isRescheduling ? null : session.id);
                setNewDate("");
                setNewTime("");
              }}
              className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white py-2.5 rounded-xl text-sm font-medium transition"
            >
              📅 Reschedule
            </button>
            <button
              onClick={() => cancelSession(session.id)}
              className="flex-1 bg-red-500/20 hover:bg-red-500/40 text-red-300 py-2.5 rounded-xl text-sm font-medium transition border border-red-500/30"
            >
              ✕ Cancel
            </button>
          </div>
        )}

        {/* Completed actions */}
        {session.status === "completed" && (
          <button
            onClick={() => router.push("/reviews")}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white py-2.5 rounded-xl text-sm font-medium transition"
          >
            ⭐ Leave a Review
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Navbar */}
      <nav className="bg-white/10 backdrop-blur-sm border-b border-white/20 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button onClick={() => router.push("/dashboard")} className="text-white/70 hover:text-white text-sm transition">
            ← Dashboard
          </button>
          <h1 className="text-white font-bold text-lg">📅 My Sessions</h1>
          <div className="text-white/50 text-sm">{upcoming.length} upcoming</div>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {sessions.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">📅</div>
            <h2 className="text-white text-xl font-semibold mb-2">No sessions yet</h2>
            <p className="text-white/50 mb-6">Accept a request to schedule your first session</p>
            <button
              onClick={() => router.push("/requests")}
              className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-xl font-medium hover:opacity-90 transition"
            >
              View Requests
            </button>
          </div>
        ) : (
          <>
            {/* Upcoming */}
            {upcoming.length > 0 && (
              <div className="mb-8">
                <h2 className="text-white font-semibold text-lg mb-4">
                  🗓️ Upcoming ({upcoming.length})
                </h2>
                <div className="space-y-4">
                  {upcoming.map((s) => <SessionCard key={s.id} session={s} />)}
                </div>
              </div>
            )}

            {/* Completed */}
            {completed.length > 0 && (
              <div>
                <h2 className="text-white font-semibold text-lg mb-4">
                  ✅ Completed ({completed.length})
                </h2>
                <div className="space-y-4">
                  {completed.map((s) => <SessionCard key={s.id} session={s} />)}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}