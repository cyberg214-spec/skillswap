"use client";

import { useEffect, useState, useRef } from "react";
import { auth, db } from "@/lib/firebase";
import {
  collection, query, where, onSnapshot,
  updateDoc, doc, writeBatch, getDocs
} from "firebase/firestore";
import { useRouter } from "next/navigation";

export default function Notifications() {
  const router = useRouter();
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((firebaseUser) => {
      if (!firebaseUser) return;

      const q = query(
        collection(db, "notifications"),
        where("toUid", "==", firebaseUser.uid)
      );

      onSnapshot(q, (snap) => {
        const data = [];
        snap.forEach(d => data.push({ id: d.id, ...d.data() }));
        data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setNotifications(data);
      });
    });
    return () => unsubscribe();
  }, []);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function markAllRead() {
    const user = auth.currentUser;
    if (!user) return;
    const q = query(
      collection(db, "notifications"),
      where("toUid", "==", user.uid),
      where("read", "==", false)
    );
    const snap = await getDocs(q);
    const batch = writeBatch(db);
    snap.forEach(d => batch.update(d.ref, { read: true }));
    await batch.commit();
  }

  async function handleClick(notif) {
    await updateDoc(doc(db, "notifications", notif.id), { read: true });
    setOpen(false);
    router.push(notif.link || "/dashboard");
  }

  const unreadCount = notifications.filter(n => !n.read).length;

  function timeAgo(isoString) {
    const diff = Date.now() - new Date(isoString).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  return (
    <div className="relative" ref={ref}>

      {/* Bell Button */}
      <button
        onClick={() => setOpen(!open)}
        className="relative text-gray-600 hover:text-indigo-600 transition p-1"
      >
        <span className="text-xl">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden">

          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <span className="font-semibold text-gray-800 text-sm">Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-indigo-500 hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <div className="text-3xl mb-2">🔔</div>
                <p className="text-sm">No notifications yet</p>
              </div>
            ) : (
              notifications.slice(0, 20).map(notif => (
                <div
                  key={notif.id}
                  onClick={() => handleClick(notif)}
                  className={`px-4 py-3 cursor-pointer hover:bg-gray-50 transition border-b border-gray-50 ${
                    !notif.read ? "bg-indigo-50" : ""
                  }`}
                >
                  <p className="text-sm text-gray-800">{notif.message}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{timeAgo(notif.createdAt)}</p>
                </div>
              ))
            )}
          </div>

        </div>
      )}
    </div>
  );
}