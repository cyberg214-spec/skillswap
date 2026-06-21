"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import {
  doc, getDoc, addDoc, updateDoc,
  collection, arrayUnion
} from "firebase/firestore";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function ReviewForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("sessionId");

  const [session, setSession] = useState(null);
  const [otherUser, setOtherUser] = useState(null);
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [myUid, setMyUid] = useState(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (!firebaseUser) { router.push("/"); return; }
      setMyUid(firebaseUser.uid);

      // Get session
      const sessionSnap = await getDoc(doc(db, "sessions", sessionId));
      if (!sessionSnap.exists()) { router.push("/sessions"); return; }
      const sessionData = sessionSnap.data();
      setSession(sessionData);

      // Get other user
      const otherUid = sessionData.participants.find(p => p !== firebaseUser.uid);
      const otherSnap = await getDoc(doc(db, "users", otherUid));
      setOtherUser({ uid: otherUid, ...otherSnap.data() });

      setLoading(false);
    });
    return () => unsubscribe();
  }, [sessionId]);

  async function submitReview() {
    if (rating === 0) { alert("Please select a star rating!"); return; }
    if (!comment.trim()) { alert("Please write a short comment!"); return; }
    setSubmitting(true);

    // Save review
    await addDoc(collection(db, "reviews"), {
      sessionId,
      reviewerUid: myUid,
      reviewedUid: otherUser.uid,
      rating,
      comment,
      createdAt: new Date().toISOString()
    });

    // Mark session as reviewed by this user
    await updateDoc(doc(db, "sessions", sessionId), {
      reviewed: arrayUnion(myUid),
      status: "completed"
    });

    // Update other user's rating
    const otherSnap = await getDoc(doc(db, "users", otherUser.uid));
    const otherData = otherSnap.data();
    const totalSessions = otherData.sessionsCompleted || 0;
    const currentRating = otherData.rating || 0;
    const newRating = totalSessions === 0
      ? rating
      : ((currentRating * totalSessions) + rating) / (totalSessions + 1);

    await updateDoc(doc(db, "users", otherUser.uid), {
      rating: Math.round(newRating * 10) / 10,
      sessionsCompleted: totalSessions + 1
    });

    // Check and award badges
    await checkBadges(otherUser.uid, otherData, session.skill);

    alert("Review submitted! Thank you 🎉");
    router.push("/sessions");
  }

  async function checkBadges(uid, userData, skill) {
    const sessions = (userData.sessionsCompleted || 0) + 1;
    const badges = userData.badges || [];
    const newBadges = [...badges];

    if (sessions >= 3 && !badges.includes(`${skill} Mentor`)) {
      newBadges.push(`${skill} Mentor`);
    }
    if (sessions >= 10 && !badges.includes("Knowledge Sharer")) {
      newBadges.push("Knowledge Sharer");
    }
    if (sessions >= 20 && !badges.includes("Top Teacher")) {
      newBadges.push("Top Teacher");
    }

    if (newBadges.length !== badges.length) {
      await updateDoc(doc(db, "users", uid), { badges: newBadges });
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-indigo-600 animate-pulse text-lg">Loading review...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-800 flex items-center justify-center px-4 py-10">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-lg flex flex-col gap-6">

        {/* Header */}
        <div className="text-center">
          <div className="text-4xl mb-2">⭐</div>
          <h1 className="text-2xl font-bold text-gray-800">Leave a Review</h1>
          <p className="text-gray-400 text-sm mt-1">
            How was your session with{" "}
            <span className="font-medium text-indigo-600">
              {otherUser?.name}
            </span>
            ?
          </p>
        </div>

        {/* Other User Card */}
        <div className="bg-indigo-50 rounded-2xl p-4 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-indigo-200 flex items-center justify-center text-indigo-700 font-bold text-xl">
            {otherUser?.name?.charAt(0)}
          </div>
          <div>
            <div className="font-semibold text-gray-800">{otherUser?.name}</div>
            <div className="text-xs text-gray-400">{otherUser?.college}</div>
            <div className="text-xs text-indigo-500 mt-1">
              Session: {session?.skill} • {session?.date} at {session?.time}
            </div>
          </div>
        </div>

        {/* Star Rating */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-600 text-center">
            Your Rating
          </label>
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map(star => (
              <button
                key={star}
                onClick={() => setRating(star)}
                onMouseEnter={() => setHovered(star)}
                onMouseLeave={() => setHovered(0)}
                className="text-4xl transition-transform hover:scale-110"
              >
                {star <= (hovered || rating) ? "⭐" : "☆"}
              </button>
            ))}
          </div>
          {rating > 0 && (
            <p className="text-center text-sm text-indigo-600 font-medium">
              {rating === 1 && "Poor"}
              {rating === 2 && "Fair"}
              {rating === 3 && "Good"}
              {rating === 4 && "Great"}
              {rating === 5 && "Excellent! 🔥"}
            </p>
          )}
        </div>

        {/* Comment */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-600">
            Your Comment
          </label>
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="How was the session? Was the person helpful? What did you learn?"
            rows={4}
            className="border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
          />
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={submitReview}
            disabled={submitting}
            className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition disabled:opacity-50"
          >
            {submitting ? "Submitting..." : "Submit Review ⭐"}
          </button>
          <button
            onClick={() => router.push("/sessions")}
            className="border border-gray-300 text-gray-500 px-6 py-3 rounded-xl text-sm font-medium hover:bg-gray-50 transition"
          >
            Skip
          </button>
        </div>

      </div>
    </div>
  );
}

export default function ReviewPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-indigo-600 animate-pulse">Loading...</p>
      </div>
    }>
      <ReviewForm />
    </Suspense>
  );
}