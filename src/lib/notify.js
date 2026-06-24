import { collection, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function sendNotification(toUid, message, link = "/dashboard") {
  try {
    await addDoc(collection(db, "notifications"), {
      toUid,
      message,
      link,
      read: false,
      createdAt: new Date().toISOString()
    });
  } catch (err) {
    console.error("Failed to send notification:", err);
  }
}