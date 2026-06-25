"use client";

import { useEffect, useState, useRef } from "react";
import { auth, db } from "@/lib/firebase";
import {
  collection, query, where, onSnapshot,
  addDoc, orderBy, doc, updateDoc, setDoc, serverTimestamp
} from "firebase/firestore";
import { useRouter } from "next/navigation";

export default function Chat() {
  const router = useRouter();
  const [myUid, setMyUid] = useState(null);
  const [chatRooms, setChatRooms] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((firebaseUser) => {
      if (!firebaseUser) { router.push("/"); return; }
      setMyUid(firebaseUser.uid);

      const q = query(
        collection(db, "chats"),
        where("participants", "array-contains", firebaseUser.uid)
      );

      onSnapshot(q, (snap) => {
        const rooms = [];
        snap.forEach(d => rooms.push({ id: d.id, ...d.data() }));
        setChatRooms(rooms);
        setLoading(false);
      });
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!selectedChat || !myUid) return;

    const msgQuery = query(
      collection(db, "chats", selectedChat.id, "messages"),
      orderBy("createdAt", "asc")
    );

    const unsubMessages = onSnapshot(msgQuery, async (snap) => {
      const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setMessages(msgs);

      const unread = snap.docs.filter(d => {
        const data = d.data();
        return data.senderUid !== myUid && !data.readBy?.includes(myUid);
      });

      for (const msgDoc of unread) {
        await updateDoc(doc(db, "chats", selectedChat.id, "messages", msgDoc.id), {
          readBy: [...(msgDoc.data().readBy || []), myUid]
        });
      }
    });

    const otherUid = selectedChat.participants.find(p => p !== myUid);
    const unsubTyping = onSnapshot(
      doc(db, "chats", selectedChat.id, "typing", otherUid),
      (snap) => {
        if (!snap.exists()) { setIsTyping(false); return; }
        const data = snap.data();
        const lastTyped = data?.lastTyped?.toMillis?.() || 0;
        setIsTyping(data.isTyping && Date.now() - lastTyped < 4000);
      }
    );

    return () => {
      unsubMessages();
      unsubTyping();
    };
  }, [selectedChat, myUid]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  async function handleTyping(e) {
    setNewMessage(e.target.value);
    if (!selectedChat || !myUid) return;

    await setDoc(doc(db, "chats", selectedChat.id, "typing", myUid), {
      isTyping: true,
      lastTyped: serverTimestamp(),
    });

    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(async () => {
      await setDoc(doc(db, "chats", selectedChat.id, "typing", myUid), {
        isTyping: false,
        lastTyped: serverTimestamp(),
      });
    }, 3000);
  }

  async function sendMessage() {
    if (!newMessage.trim()) return;
    const user = auth.currentUser;

    await addDoc(collection(db, "chats", selectedChat.id, "messages"), {
      text: newMessage.trim(),
      senderUid: user.uid,
      senderName: user.displayName,
      createdAt: new Date().toISOString(),
      readBy: [user.uid],
    });

    await updateDoc(doc(db, "chats", selectedChat.id), {
      lastMessage: newMessage.trim(),
      lastMessageTime: new Date().toISOString(),
    });

    await setDoc(doc(db, "chats", selectedChat.id, "typing", user.uid), {
      isTyping: false,
      lastTyped: serverTimestamp(),
    });

    clearTimeout(typingTimeoutRef.current);
    setNewMessage("");
  }

  function getOtherPersonName(room) {
    const otherUid = room.participants.find(p => p !== myUid);
    return room.participantNames?.[otherUid] || "Unknown";
  }

  function formatTime(isoString) {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-gray-50">
      <p className="text-indigo-600 animate-pulse text-lg">Loading chats...</p>
    </div>
  );

  return (
    // FIX 1: h-screen + overflow-hidden instead of min-h-screen
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">

      {/* Navbar */}
      <nav className="bg-white shadow-sm px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div
          onClick={() => router.push("/dashboard")}
          className="text-2xl font-bold text-indigo-700 cursor-pointer"
        >
          🔁 SkillSwap
        </div>
        <div className="flex gap-4 text-sm font-medium text-gray-500">
          <button onClick={() => router.push("/dashboard")} className="hover:text-indigo-600">Dashboard</button>
          <button onClick={() => router.push("/discover")} className="hover:text-indigo-600">Discover</button>
          <button onClick={() => router.push("/requests")} className="hover:text-indigo-600">Requests</button>
        </div>
      </nav>

      {/* FIX 2: flex-1 min-h-0 so this section fills remaining space without overflowing */}
      <div className="flex flex-1 min-h-0 max-w-6xl mx-auto w-full px-4 py-6 gap-4 overflow-hidden">

        {/* Left Sidebar */}
        <div className="w-80 bg-white rounded-2xl shadow-sm flex flex-col overflow-hidden border border-gray-100 flex-shrink-0">
          <div className="p-4 border-b border-gray-100 flex-shrink-0">
            <h2 className="font-bold text-gray-800 text-lg">💬 My Chats</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {chatRooms.length} conversation{chatRooms.length !== 1 ? "s" : ""}
            </p>
          </div>

          <div className="flex-1 overflow-y-auto min-h-0">
            {chatRooms.length === 0 ? (
              <div className="text-center py-16 text-gray-400 px-4">
                <div className="text-4xl mb-3">💬</div>
                <p className="text-sm">No chats yet</p>
                <p className="text-xs mt-1">Accept a request to start chatting</p>
              </div>
            ) : (
              chatRooms.map(room => (
                <div
                  key={room.id}
                  onClick={() => setSelectedChat(room)}
                  className={`flex items-center gap-3 px-4 py-4 cursor-pointer transition border-b border-gray-50 ${
                    selectedChat?.id === room.id
                      ? "bg-indigo-50 border-l-4 border-l-indigo-500"
                      : "hover:bg-gray-50"
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold flex-shrink-0">
                    {getOtherPersonName(room).charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-800 text-sm truncate">
                      {getOtherPersonName(room)}
                    </div>
                    <div className="text-xs text-gray-400 truncate mt-0.5">
                      {room.lastMessage || "Say hello!"}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Side - Message Area */}
        {/* FIX 3: flex-1 min-h-0 overflow-hidden so it doesn't grow past screen */}
        <div className="flex-1 min-h-0 bg-white rounded-2xl shadow-sm flex flex-col overflow-hidden border border-gray-100">

          {!selectedChat ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
              <div className="text-6xl mb-4">💬</div>
              <p className="font-medium text-gray-500">Select a chat to start messaging</p>
              <p className="text-sm mt-1">Your conversations will appear here</p>
            </div>
          ) : (
            <>
              {/* Chat Header — flex-shrink-0 so it never gets squished */}
              <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3 flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
                  {getOtherPersonName(selectedChat).charAt(0)}
                </div>
                <div>
                  <div className="font-semibold text-gray-800">
                    {getOtherPersonName(selectedChat)}
                  </div>
                  {isTyping ? (
                    <div className="text-xs text-indigo-500 animate-pulse">typing...</div>
                  ) : (
                    <div className="text-xs text-green-500">● Online</div>
                  )}
                </div>
                <button
                  onClick={() => router.push("/sessions")}
                  className="ml-auto px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition"
                >
                  📅 Schedule Session
                </button>
              </div>

              {/* FIX 4: Messages area — flex-1 min-h-0 with inline minHeight:0 to force shrink */}
              <div
                className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-3"
                style={{ minHeight: 0 }}
              >
                {messages.length === 0 ? (
                  <div className="text-center text-gray-400 mt-16">
                    <p className="text-sm">No messages yet</p>
                    <p className="text-xs mt-1">Say hello and introduce yourself! 👋</p>
                  </div>
                ) : (
                  messages.map((msg, index) => {
                    const isMe = msg.senderUid === myUid;
                    const otherUid = selectedChat.participants.find(p => p !== myUid);
                    const isRead = msg.readBy?.includes(otherUid);
                    const isLastFromMe = isMe && (
                      index === messages.length - 1 ||
                      messages[index + 1]?.senderUid !== myUid
                    );

                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                      >
                        <div className={`max-w-xs lg:max-w-md px-4 py-2.5 rounded-2xl text-sm ${
                          isMe
                            ? "bg-indigo-600 text-white rounded-br-sm"
                            : "bg-gray-100 text-gray-800 rounded-bl-sm"
                        }`}>
                          <p>{msg.text}</p>
                          <div className={`flex items-center gap-1 mt-1 ${isMe ? "justify-end" : "justify-start"}`}>
                            <p className={`text-xs ${isMe ? "text-indigo-200" : "text-gray-400"}`}>
                              {formatTime(msg.createdAt)}
                            </p>
                            {isMe && isLastFromMe && (
                              <span className={`text-xs ${isRead ? "text-indigo-200" : "text-indigo-300/50"}`}>
                                {isRead ? "✓✓" : "✓"}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}

                {/* Typing bubble */}
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 text-gray-500 px-4 py-3 rounded-2xl rounded-bl-sm text-sm flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* FIX 5: Input bar — flex-shrink-0 so it always stays visible at the bottom */}
              <div className="px-6 py-4 border-t border-gray-100 flex gap-3 items-center flex-shrink-0">
                <input
                  value={newMessage}
                  onChange={handleTyping}
                  onKeyDown={e => e.key === "Enter" && sendMessage()}
                  placeholder="Type a message... (Enter to send)"
                  className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim()}
                  className="bg-indigo-600 text-white px-5 py-3 rounded-xl text-sm font-medium hover:bg-indigo-700 transition disabled:opacity-40"
                >
                  Send →
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
