// src/lib/notify.js
// Call this whenever you want to send a notification to a user.
// Import it in any page: import { sendNotification } from "@/lib/notify";

import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function sendNotification(toUid, type, message) {
  try {
    await addDoc(collection(db, "notifications"), {
      toUid,
      type,
      message,
      read: false,
      createdAt: serverTimestamp(),
    });
  } catch (e) {
    console.error("Failed to send notification:", e);
  }
}