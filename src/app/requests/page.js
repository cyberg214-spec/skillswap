"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import {
  collection, query, where, onSnapshot,
  doc, updateDoc, addDoc, deleteDoc
} from "firebase/firestore";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { sendNotification } from "@/lib/notify";

export default function Requests() {
  const router = useRouter();
  const showToast = useToast();
  const [incoming, setIncoming] = useState([]);
  const [outgoing, setOutgoing] = useState([]);
  const [tab, setTab] = useState("incoming");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((firebaseUser) => {
      if (!firebaseUser) { router.push("/"); return; }

      const inQuery = query(
        collection(db, "requests"),
        where("toUid", "==", firebaseUser.uid)
      );
      onSnapshot(inQuery, (snap) => {
        const data = [];
        snap.forEach(d => data.push({ id: d.id, ...d.data() }));
        setIncoming(data);
        setLoading(false);
      });

      const outQuery = query(
        collection(db, "requests"),
        where("fromUid", "==", firebaseUser.uid)
      );
      onSnapshot(outQuery, (snap) => {
        const data = [];
        snap.forEach(d => data.push({ id: d.id, ...d.data() }));
        setOutgoing(data);
      });
    });
    return () => unsubscribe();
  }, []);

  async function handleAccept(request) {
    await updateDoc(doc(db, "requests", request.id), { status: "accepted" });

    await addDoc(collection(db, "chats"), {
      participants: [request.fromUid, request.toUid],
      participantNames: {
        [request.fromUid]: request.fromName,
        [request.toUid]: auth.currentUser.displayName
      },
      createdAt: new Date().toISOString(),
      lastMessage: "Chat started!",
      lastMessageTime: new Date().toISOString()
    });

    // Notify the sender that their request was accepted
    await sendNotification(
      request.fromUid,
      `🎉 ${auth.currentUser.displayName} accepted your skill swap request!`,
      "/chat"
    );

    showToast("Request accepted! Chat is now open. 💬");
  }

  async function handleReject(request) {
    await updateDoc(doc(db, "requests", request.id), { status: "rejected" });

    // Notify the sender that their request was declined
    await sendNotification(
      request.fromUid,
      `❌ ${auth.currentUser.displayName} declined your skill swap request.`,
      "/requests"
    );

    showToast("Request rejected.", "error");
  }

  async function handleCancel(requestId) {
    await deleteDoc(doc(db, "requests", requestId));
    showToast("Request cancelled.");
  }

  function StatusBadge({ status }) {
    const styles = {
      pending: "bg-yellow-100 text-yellow-600",
      accepted: "bg-green-100 text-green-600",
      rejected: "bg-red-100 text-red-500"
    };
    return (
      <span className={`text-xs px-2 py-1 rounded-full font-medium ${styles[status]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-indigo-600 animate-pulse text-lg">Loading requests...</p>
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
          <button onClick={() => router.push("/sessions")} className="hover:text-indigo-600">Sessions</button>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-10 flex flex-col gap-6">

        <div>
          <h1 className="text-3xl font-bold text-gray-800">My Requests 📬</h1>
          <p className="text-gray-400 text-sm mt-1">Manage your incoming and outgoing skill exchange requests</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 bg-white rounded-xl p-1 shadow-sm w-fit">
          <button onClick={() => setTab("incoming")}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition ${tab === "incoming" ? "bg-indigo-600 text-white" : "text-gray-500 hover:text-indigo-600"}`}>
            Incoming ({incoming.length})
          </button>
          <button onClick={() => setTab("outgoing")}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition ${tab === "outgoing" ? "bg-purple-600 text-white" : "text-gray-500 hover:text-purple-600"}`}>
            Outgoing ({outgoing.length})
          </button>
        </div>

        {/* Incoming */}
        {tab === "incoming" && (
          <div className="flex flex-col gap-4">
            {incoming.length === 0 ? (
              <div className="text-center py-20 text-gray-400">
                <div className="text-4xl mb-3">📭</div>
                <p>No incoming requests yet</p>
              </div>
            ) : (
              incoming.map(req => (
                <div key={req.id} className="bg-white rounded-2xl shadow-sm p-6 flex items-center justify-between border border-gray-100">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-lg">
                      {req.fromName?.charAt(0)}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-800">{req.fromName}</div>
                      <div className="text-xs text-gray-400 mt-0.5">Wants to swap skills with you</div>
                      <div className="mt-1"><StatusBadge status={req.status} /></div>
                    </div>
                  </div>

                  {req.status === "pending" && (
                    <div className="flex gap-2">
                      <button onClick={() => handleAccept(req)}
                        className="px-4 py-2 bg-green-500 text-white rounded-xl text-sm font-medium hover:bg-green-600 transition">
                        ✓ Accept
                      </button>
                      <button onClick={() => handleReject(req)}
                        className="px-4 py-2 bg-red-100 text-red-500 rounded-xl text-sm font-medium hover:bg-red-200 transition">
                        ✕ Reject
                      </button>
                    </div>
                  )}

                  {req.status === "accepted" && (
                    <button onClick={() => router.push("/chat")}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition">
                      💬 Open Chat
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Outgoing */}
        {tab === "outgoing" && (
          <div className="flex flex-col gap-4">
            {outgoing.length === 0 ? (
              <div className="text-center py-20 text-gray-400">
                <div className="text-4xl mb-3">📤</div>
                <p>No outgoing requests yet</p>
                <button onClick={() => router.push("/discover")}
                  className="mt-3 text-indigo-600 text-sm font-medium hover:underline">
                  Discover people →
                </button>
              </div>
            ) : (
              outgoing.map(req => (
                <div key={req.id} className="bg-white rounded-2xl shadow-sm p-6 flex items-center justify-between border border-gray-100">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold text-lg">
                      {req.toName?.charAt(0)}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-800">{req.toName}</div>
                      <div className="text-xs text-gray-400 mt-0.5">Request sent</div>
                      <div className="mt-1"><StatusBadge status={req.status} /></div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {req.status === "accepted" && (
                      <button onClick={() => router.push("/chat")}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition">
                        💬 Open Chat
                      </button>
                    )}
                    {req.status === "pending" && (
                      <button onClick={() => handleCancel(req.id)}
                        className="px-4 py-2 bg-red-50 text-red-500 rounded-xl text-sm font-medium hover:bg-red-100 transition">
                        ✕ Cancel Request
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