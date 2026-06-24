"use client";
import { useEffect, useState } from "react";
import { db, auth } from "@/lib/firebase";
import {
  doc, getDoc, collection, query,
  where, getDocs, addDoc, setDoc, deleteDoc
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
  const [isBlocked, setIsBlocked] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportSubmitting, setReportSubmitting] = useState(false);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => setCurrentUser(u));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!uid) return;
    async function load() {
      const userDoc = await getDoc(doc(db, "users", uid));
      if (!userDoc.exists()) { router.push("/discover"); return; }
      setProfile({ uid, ...userDoc.data() });

      const reviewQuery = query(
        collection(db, "reviews"),
        where("revieweeUid", "==", uid)
      );
      const reviewSnap = await getDocs(reviewQuery);
      setReviews(reviewSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

      setLoading(false);
    }
    load();
  }, [uid, router]);

  useEffect(() => {
    if (!currentUser || !uid) return;
    async function checkStatus() {
      const reqQ = query(
        collection(db, "requests"),
        where("fromUid", "==", currentUser.uid),
        where("toUid", "==", uid)
      );
      const reqSnap = await getDocs(reqQ);
      if (!reqSnap.empty) setAlreadyRequested(true);

      const blockDoc = await getDoc(doc(db, "blocks", `${currentUser.uid}_${uid}`));
      if (blockDoc.exists()) setIsBlocked(true);
    }
    checkStatus();
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

      await sendNotification(uid, "request_received",
        `🤝 ${currentUserName} sent you a skill swap request!`
      );

      setAlreadyRequested(true);
      showToast("Request sent! 🎉");
    } catch {
      showToast("Failed to send request", "error");
    }
    setRequesting(false);
  }

  async function handleBlock() {
    if (!currentUser) return;
    if (isBlocked) {
      await deleteDoc(doc(db, "blocks", `${currentUser.uid}_${uid}`));
      setIsBlocked(false);
      showToast("User unblocked.");
    } else {
      await setDoc(doc(db, "blocks", `${currentUser.uid}_${uid}`), {
        blockedBy: currentUser.uid,
        blockedUid: uid,
        createdAt: new Date().toISOString(),
      });
      setIsBlocked(true);
      showToast("User blocked. They won't appear in your Discover.");
    }
  }

  async function handleReport() {
    if (!reportReason.trim()) {
      showToast("Please select or enter a reason", "error");
      return;
    }
    setReportSubmitting(true);
    try {
      await addDoc(collection(db, "reports"), {
        reportedUid: uid,
        reportedName: profile.name,
        reporterUid: currentUser.uid,
        reason: reportReason,
        createdAt: new Date().toISOString(),
        status: "pending",
      });
      showToast("Report submitted. Thank you! 🙏");
      setShowReportModal(false);
      setReportReason("");
    } catch {
      showToast("Failed to submit report", "error");
    }
    setReportSubmitting(false);
  }

  // ---- NEW: Share profile link ----
  async function handleShare() {
    const url = `${window.location.origin}/profile/${uid}`;
    try {
      // Use native share sheet on mobile if available
      if (navigator.share) {
        await navigator.share({
          title: `${profile.name} on SkillSwap`,
          text: `Check out ${profile.name}'s skill profile on SkillSwap!`,
          url,
        });
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(url);
        showToast("Profile link copied! 🔗");
      }
    } catch {
      // If clipboard also fails, show the URL in toast
      showToast("Profile link copied! 🔗");
    }
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
          <button onClick={() => router.back()} className="text-white/70 hover:text-white text-sm transition">
            ← Back
          </button>
          <h1 className="text-white font-bold">👤 Profile</h1>
          {/* Share button in navbar */}
          <button
            onClick={handleShare}
            className="text-white/70 hover:text-white text-sm transition flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-white/10"
          >
            🔗 Share
          </button>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

        {/* Profile header */}
        <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-8 border border-white/20">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
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

          {/* Action buttons */}
          <div className="mt-6 flex flex-col gap-3">
            {isOwnProfile ? (
              <>
                <button
                  onClick={() => router.push("/edit-profile")}
                  className="w-full bg-white/10 hover:bg-white/20 text-white py-3 rounded-2xl font-medium transition border border-white/20"
                >
                  ✏️ Edit Your Profile
                </button>
                {/* Share own profile */}
                <button
                  onClick={handleShare}
                  className="w-full bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 py-3 rounded-2xl font-medium transition border border-purple-500/30"
                >
                  🔗 Share My Profile
                </button>
              </>
            ) : (
              <>
                {alreadyRequested ? (
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

                <div className="flex gap-3">
                  <button
                    onClick={handleBlock}
                    className={`flex-1 py-2.5 rounded-2xl text-sm font-medium transition border ${
                      isBlocked
                        ? "bg-white/10 text-white/60 border-white/20 hover:bg-white/20"
                        : "bg-red-500/10 text-red-300 border-red-500/30 hover:bg-red-500/20"
                    }`}
                  >
                    {isBlocked ? "🔓 Unblock User" : "🚫 Block User"}
                  </button>
                  <button
                    onClick={() => setShowReportModal(true)}
                    className="flex-1 py-2.5 rounded-2xl text-sm font-medium transition border bg-orange-500/10 text-orange-300 border-orange-500/30 hover:bg-orange-500/20"
                  >
                    ⚠️ Report User
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Teaching skills */}
        {teachSkills.length > 0 && (
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
            <h3 className="text-white font-semibold text-lg mb-4">🎓 Can Teach</h3>
            <div className="flex flex-wrap gap-2">
              {teachSkills.map((s, i) => (
                <span key={i} className="bg-purple-500/20 text-purple-300 border border-purple-500/30 px-3 py-1.5 rounded-xl text-sm flex items-center gap-1.5">
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
                <span key={i} className="bg-pink-500/20 text-pink-300 border border-pink-500/30 px-3 py-1.5 rounded-xl text-sm">
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
                <div key={r.id} className="bg-white/5 rounded-2xl p-4 border border-white/10">
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

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center px-4">
          <div className="bg-slate-800 rounded-3xl p-6 w-full max-w-sm border border-white/20">
            <h3 className="text-white font-bold text-lg mb-4">⚠️ Report User</h3>
            <p className="text-white/60 text-sm mb-4">
              Why are you reporting <span className="text-white font-medium">{profile.name}</span>?
            </p>
            <div className="flex flex-col gap-2 mb-4">
              {["Inappropriate behavior", "Spam or fake profile", "Harassment", "Misleading skills", "Other"].map((reason) => (
                <button
                  key={reason}
                  onClick={() => setReportReason(reason)}
                  className={`text-left px-4 py-2.5 rounded-xl text-sm transition border ${
                    reportReason === reason
                      ? "bg-orange-500/20 text-orange-300 border-orange-500/40"
                      : "bg-white/5 text-white/60 border-white/10 hover:bg-white/10"
                  }`}
                >
                  {reason}
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowReportModal(false); setReportReason(""); }}
                className="flex-1 bg-white/10 hover:bg-white/20 text-white py-2.5 rounded-xl text-sm transition"
              >
                Cancel
              </button>
              <button
                onClick={handleReport}
                disabled={reportSubmitting || !reportReason}
                className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-2.5 rounded-xl text-sm font-medium transition disabled:opacity-50"
              >
                {reportSubmitting ? "Submitting..." : "Submit Report"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}