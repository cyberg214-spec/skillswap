"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { collection, getDocs, doc, getDoc, addDoc, query, where, getDocs as getDocsQ } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";

const LEVEL_COLORS = {
  Beginner: "bg-green-100 text-green-700",
  Intermediate: "bg-yellow-100 text-yellow-700",
  Expert: "bg-red-100 text-red-700"
};

const CATEGORIES = [
  "All",
  "Programming & Dev",
  "Data & AI",
  "Design & Creative",
  "Business & Marketing",
  "Languages",
  "Music & Arts",
  "Academics",
  "Soft Skills",
  "Sports & Wellness",
  "Cooking & Lifestyle"
];

const CATEGORY_SKILLS = {
  "Programming & Dev": ["Python","JavaScript","TypeScript","Java","C++","C","C#","Go","Rust","React","Next.js","Vue.js","Angular","Node.js","Express.js","HTML/CSS","Tailwind CSS","PHP","Swift","Kotlin","Flutter","React Native","SQL","MongoDB","Firebase","Git & GitHub","Docker","DevOps","Linux"],
  "Data & AI": ["Machine Learning","Deep Learning","Data Analysis","Data Science","Data Visualization","Excel","Power BI","Tableau","NLP","Computer Vision","Pandas/NumPy","Statistics","Prompt Engineering"],
  "Design & Creative": ["UI Design","UX Design","Figma","Adobe Photoshop","Adobe Illustrator","Adobe Premiere Pro","Video Editing","Graphic Design","3D Modeling","Animation","Canva","Logo Design"],
  "Business & Marketing": ["Digital Marketing","SEO","Content Writing","Copywriting","Social Media Marketing","Email Marketing","Business Strategy","Public Speaking","Sales","Negotiation","Project Management","Entrepreneurship","Personal Finance","Stock Market Investing"],
  "Languages": ["English Speaking","Spanish","French","German","Japanese","Korean","Mandarin Chinese","Hindi","Sign Language"],
  "Music & Arts": ["Guitar","Piano","Singing","Music Production","DJing","Painting","Sketching","Photography","Creative Writing","Poetry"],
  "Academics": ["Mathematics","Physics","Chemistry","Biology","Algebra","Calculus","Economics","Accounting","Academic Writing","Research Methods"],
  "Soft Skills": ["Leadership","Time Management","Critical Thinking","Resume Building","Interview Preparation","Networking"],
  "Sports & Wellness": ["Yoga","Meditation","Fitness Training","Nutrition","Chess","Cricket","Football","Basketball","Badminton","Swimming"],
  "Cooking & Lifestyle": ["Cooking","Baking","Gardening","Interior Design","Fashion Styling"]
};

export default function Discover() {
  const router = useRouter();
  const showToast = useToast();
  const [myProfile, setMyProfile] = useState(null);
  const [users, setUsers] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [collegeFilter, setCollegeFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [colleges, setColleges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sentRequests, setSentRequests] = useState([]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (!firebaseUser) { router.push("/"); return; }

      const myDoc = await getDoc(doc(db, "users", firebaseUser.uid));
      const myData = myDoc.data();
      setMyProfile({ ...myData, uid: firebaseUser.uid });

      const snapshot = await getDocs(collection(db, "users"));
      const allUsers = [];
      const collegeSet = new Set();
      snapshot.forEach(d => {
        if (d.id !== firebaseUser.uid) {
          allUsers.push(d.data());
          if (d.data().college) collegeSet.add(d.data().college);
        }
      });

      setColleges(["All", ...Array.from(collegeSet)]);

      // Smart match scoring
      const myLearn = myData.learn || [];
      const myTeach = (myData.teach || []).map(t => typeof t === "string" ? t : t.skill);

      const scored = allUsers.map(u => {
        const uTeachSkills = (u.teach || []).map(t => typeof t === "string" ? t : t.skill);
        const uLearnSkills = u.learn || [];

        let score = 0;
        const teachMatch = uTeachSkills.some(s => myLearn.includes(s));
        const learnMatch = uLearnSkills.some(s => myTeach.includes(s));
        if (teachMatch) score += 50;
        if (learnMatch) score += 50;
        if (u.rating > 0) score += u.rating * 2;
        return { ...u, score, uTeachSkills, uLearnSkills };
      });

      scored.sort((a, b) => b.score - a.score);
      setUsers(scored);
      setFiltered(scored);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Apply all filters together
  useEffect(() => {
    let result = [...users];

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(u =>
        u.name?.toLowerCase().includes(q) ||
        u.uTeachSkills?.some(s => s.toLowerCase().includes(q)) ||
        u.uLearnSkills?.some(s => s.toLowerCase().includes(q))
      );
    }

    // College filter
    if (collegeFilter !== "All") {
      result = result.filter(u => u.college === collegeFilter);
    }

    // Category filter
    if (categoryFilter !== "All") {
      const catSkills = CATEGORY_SKILLS[categoryFilter] || [];
      result = result.filter(u =>
        u.uTeachSkills?.some(s => catSkills.includes(s)) ||
        u.uLearnSkills?.some(s => catSkills.includes(s))
      );
    }

    setFiltered(result);
  }, [search, collegeFilter, categoryFilter, users]);

  async function sendRequest(toUser) {
    const from = auth.currentUser;
    await addDoc(collection(db, "requests"), {
      fromUid: from.uid,
      fromName: myProfile.name,
      fromPhoto: from.photoURL,
      toUid: toUser.uid,
      toName: toUser.name,
      status: "pending",
      createdAt: new Date().toISOString()
    });
    setSentRequests(prev => [...prev, toUser.uid]);
    showToast(`Request sent to ${toUser.name}! 🎉`);
  }

  function getMatchLabel(user) {
    const myLearn = myProfile?.learn || [];
    const myTeach = (myProfile?.teach || []).map(t => typeof t === "string" ? t : t.skill);
    const teachMatch = user.uTeachSkills?.some(s => myLearn.includes(s));
    const learnMatch = user.uLearnSkills?.some(s => myTeach.includes(s));
    if (teachMatch && learnMatch) return { label: "Perfect Match 🔥", color: "bg-green-100 text-green-700" };
    if (teachMatch) return { label: "Can Teach You", color: "bg-indigo-100 text-indigo-700" };
    if (learnMatch) return { label: "Wants to Learn From You", color: "bg-purple-100 text-purple-700" };
    return { label: "Community Member", color: "bg-gray-100 text-gray-500" };
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-indigo-600 animate-pulse text-lg">Finding your matches...</p>
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
          <button onClick={() => router.push("/requests")} className="hover:text-indigo-600">Requests</button>
          <button onClick={() => router.push("/sessions")} className="hover:text-indigo-600">Sessions</button>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-10 flex flex-col gap-6">

        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Discover People 🔍</h1>
          <p className="text-gray-400 text-sm mt-1">Find people who match your skills — sorted by best match first</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-3">

          {/* Search */}
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or skill (e.g. Python, React...)"
            className="border border-gray-300 rounded-xl px-4 py-3 text-sm w-full focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />

          <div className="flex gap-3 flex-wrap">
            {/* College Filter */}
            <select
              value={collegeFilter}
              onChange={e => setCollegeFilter(e.target.value)}
              className="border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
            >
              {colleges.map(c => (
                <option key={c} value={c}>{c === "All" ? "🏫 All Colleges" : c}</option>
              ))}
            </select>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
            >
              {CATEGORIES.map(c => (
                <option key={c} value={c}>{c === "All" ? "📚 All Categories" : c}</option>
              ))}
            </select>

            {/* Reset */}
            {(search || collegeFilter !== "All" || categoryFilter !== "All") && (
              <button
                onClick={() => { setSearch(""); setCollegeFilter("All"); setCategoryFilter("All"); }}
                className="text-sm text-gray-400 hover:text-red-400 px-3 py-2 rounded-xl border border-gray-200 hover:border-red-200 transition"
              >
                ✕ Reset filters
              </button>
            )}
          </div>

          <p className="text-xs text-gray-400">
            Showing {filtered.length} of {users.length} users
          </p>
        </div>

        {/* User Cards */}
        {filtered.length === 0 ? (
          <p className="text-gray-400 text-center py-20">No users found. Try a different search or filter.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map(user => {
              const match = getMatchLabel(user);
              const alreadySent = sentRequests.includes(user.uid);
              const teachItems = (user.teach || []).map(t =>
                typeof t === "string" ? { skill: t, level: null } : t
              );

              return (
                <div key={user.uid} className="bg-white rounded-2xl shadow-sm p-6 flex flex-col gap-4 border border-gray-100">

                  {/* Top Row */}
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-lg overflow-hidden flex-shrink-0">
                      {user.photoBase64 ? (
                        <img src={user.photoBase64} alt={user.name} className="w-full h-full object-cover" />
                      ) : (
                        user.name?.charAt(0)
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-gray-800">{user.name}</div>
                      <div className="text-xs text-gray-400">{user.college}</div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${match.color}`}>
                      {match.label}
                    </span>
                  </div>

                  {/* Skills */}
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-wrap gap-1 items-center">
                      <span className="text-xs text-gray-400 mr-1">Teaches:</span>
                      {teachItems.map(({ skill, level }) => (
                        <span
                          key={skill}
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            level ? LEVEL_COLORS[level] : "bg-indigo-50 text-indigo-600"
                          }`}
                        >
                          {skill}{level ? ` · ${level}` : ""}
                        </span>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-1 items-center">
                      <span className="text-xs text-gray-400 mr-1">Wants:</span>
                      {(user.learn || []).map(s => (
                        <span key={s} className="bg-purple-50 text-purple-600 text-xs px-2 py-0.5 rounded-full">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Bottom Row */}
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-yellow-500 font-medium">
                      {user.rating > 0 ? `⭐ ${user.rating}` : "⭐ New"}
                    </div>
                    <button
                      onClick={() => sendRequest(user)}
                      disabled={alreadySent}
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                        alreadySent
                          ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                          : "bg-indigo-600 text-white hover:bg-indigo-700"
                      }`}
                    >
                      {alreadySent ? "Request Sent ✓" : "Send Request"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}