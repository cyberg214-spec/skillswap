"use client";
import { useEffect, useState } from "react";
import { db, auth } from "@/lib/firebase";
import {
  doc, getDoc, collection, query,
  where, getDocs, addDoc
} from "firebase/firestore";
import { useRouter, useParams } from "next/navigation";
import { useToast } from "@/components/Toast";
import { sendNotification } from "@/lib/notify";

export default function PublicProfile() {
  const { uid } = useParams();
  const router = useRouter();
  const showToast = useToast();

  const [profile, setProfile] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [alreadyRequested, setAlreadyRequested] = useState(false);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => {
      setCurrentUser(u);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!uid) return;
    async function load() {
      // Load profile
      const userDoc = await getDoc(doc(db, "users", uid));
      if (!userDoc.exists()) { router.push("/discover"); return; }
      setProfile({ uid, ...userDoc.data() });

      // Load reviews for this user
      const reviewQuery = query(
        collection(db, "reviews"),
        where("revieweeUid", "==", uid)
      );
      const reviewSnap = await getDocs(reviewQuery);
      const reviewData = reviewSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setReviews(reviewData);

      setLoading(false);
    }
    load();
  }, [uid, router]);

  // Check if current user already sent a request
  useEffect(() => {
    if (!currentUser || !uid) return;
    async function checkRequest() {
      const q = query(
        collection(db, "requests"),
        where("fromUid", "==", currentUser.uid),
        where("toUid", "==", uid)
      );
      const snap = await getDocs(q);
      if (!snap.empty) setAlreadyRequested(true);
    }
    checkRequest();
  }, [currentUser, uid]);

  async function handleSendRequest() {
    if (!currentUser) { router.push("/"); return; }
    if (currentUser.uid === uid) {
      showToast("That's your own profile!", "error");
      return;
    }
    setRequesting(true);
    try {
      const currentUserDoc = await getDoc(doc(db, "users", currentUser.uid));
      const currentUserName = currentUserDoc.data()?.name || currentUser.displayName;

      await addDoc(collection(db, "requests"), {
        fromUid: currentUser.uid,
        fromName: currentUserName,
        toUid: uid,
        toName: profile.name,
        status: "pending",
        createdAt: new Date().toISOString(),
      });

      await sendNotification(
        uid,
        "request_received",
        `🤝 ${currentUserName} sent you a skill swap request!`
      );

      setAlreadyRequested(true);
      showToast("Request sent! 🎉");
    } catch {
      showToast("Failed to send request", "error");
    }
    setRequesting(false);
  }

  function getTeachSkills() {
    const t = profile?.teaching;
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

  function StarRating({ rating }) {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((s) => (
          <span key={s} className={s <= rating ? "text-yellow-400" : "text-white/20"}>★</span>
        ))}
      </div>
    );
  }

  function timeAgo(ts) {
    if (!ts) return "";
    const date = new Date(ts);
    const diff = Math.floor((Date.now() - date) / 1000);
    if (diff < 86400) return "Today";
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  }

  const avgRating = reviews.length
    ? (reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length).toFixed(1)
    : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl animate-pulse">Loading profile...</div>
      </div>
    );
  }

  const teachSkills = getTeachSkills();
  const learnSkills = profile?.learning || [];
  const isOwnProfile = currentUser?.uid === uid;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Navbar */}
      <nav className="bg-white/10 backdrop-blur-sm border-b border-white/20 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="text-white/70 hover:text-white text-sm transition"
          >
            ← Back
          </button>
          <h1 className="text-white font-bold">👤 Profile</h1>
          <button
            onClick={() => router.push("/dashboard")}
            className="text-white/70 hover:text-white text-sm transition"
          >
            Dashboard
          </button>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

        {/* Profile header */}
        <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-8 border border-white/20">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            {/* Avatar */}
            {profile.photoBase64 ? (
              <img
                src={profile.photoBase64}
                alt={profile.name}
                className="w-24 h-24 rounded-full object-cover border-4 border-purple-400 shrink-0"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-4xl shrink-0">
                {profile.name?.charAt(0)}
              </div>
            )}

            {/* Info */}
            <div className="flex-1 text-center sm:text-left">
              <h2 className="text-white text-2xl font-bold">{profile.name}</h2>
              <p className="text-purple-300 mt-1">🏫 {profile.college}</p>
              {avgRating && (
                <div className="flex items-center gap-2 mt-2 justify-center sm:justify-start">
                  <StarRating rating={Math.round(avgRating)} />
                  <span className="text-yellow-400 font-semibold">{avgRating}</span>
                  <span className="text-white/40 text-sm">({reviews.length} review{reviews.length !== 1 ? "s" : ""})</span>
                </div>
              )}
              {profile.bio && (
                <p className="text-white/70 mt-3 text-sm leading-relaxed">{profile.bio}</p>
              )}
            </div>
          </div>

          {/* Action button */}
          <div className="mt-6">
            {isOwnProfile ? (
              <button
                onClick={() => router.push("/edit-profile")}
                className="w-full bg-white/10 hover:bg-white/20 text-white py-3 rounded-2xl font-medium transition border border-white/20"
              >
                ✏️ Edit Your Profile
              </button>
            ) : alreadyRequested ? (
              <div className="w-full bg-green-500/20 text-green-300 py-3 rounded-2xl font-medium text-center border border-green-500/30">
                ✅ Request Already Sent
              </div>
            ) : (
              <button
                onClick={handleSendRequest}
                disabled={requesting}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white py-3 rounded-2xl font-medium transition disabled:opacity-50"
              >
                {requesting ? "Sending..." : "🤝 Send Skill Swap Request"}
              </button>
            )}
          </div>
        </div>

        {/* Teaching skills */}
        {teachSkills.length > 0 && (
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
            <h3 className="text-white font-semibold text-lg mb-4">🎓 Can Teach</h3>
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
          </div>
        )}

        {/* Learning skills */}
        {learnSkills.length > 0 && (
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
            <h3 className="text-white font-semibold text-lg mb-4">📚 Wants to Learn</h3>
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
          </div>
        )}

        {/* Reviews */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
          <h3 className="text-white font-semibold text-lg mb-4">
            ⭐ Reviews {reviews.length > 0 && `(${reviews.length})`}
          </h3>
          {reviews.length === 0 ? (
            <p className="text-white/40 text-sm text-center py-4">No reviews yet</p>
          ) : (
            <div className="space-y-4">
              {reviews.map((r) => (
                <div
                  key={r.id}
                  className="bg-white/5 rounded-2xl p-4 border border-white/10"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-bold">
                        {r.reviewerName?.charAt(0) || "?"}
                      </div>
                      <span className="text-white/80 text-sm font-medium">{r.reviewerName || "Anonymous"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <StarRating rating={r.rating} />
                      <span className="text-white/30 text-xs">{timeAgo(r.createdAt)}</span>
                    </div>
                  </div>
                  {r.comment && (
                    <p className="text-white/60 text-sm leading-relaxed mt-2">{r.comment}</p>
                  )}
                  {r.skillExchanged && (
                    <p className="text-purple-400 text-xs mt-2">Skill: {r.skillExchanged}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}