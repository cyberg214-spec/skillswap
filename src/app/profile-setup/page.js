"use client";

import { useState } from "react";
import { auth, db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";

const SKILLS_LIST = [
  "Python", "JavaScript", "React", "UI Design", "Figma",
  "Java", "C++", "Machine Learning", "Data Analysis",
  "Node.js", "SQL", "Excel", "Video Editing", "Photoshop",
  "Public Speaking", "Content Writing", "Digital Marketing"
];

export default function ProfileSetup() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [college, setCollege] = useState("");
  const [bio, setBio] = useState("");
  const [teaching, setTeaching] = useState([]);
  const [learning, setLearning] = useState([]);
  const [loading, setLoading] = useState(false);

  function toggleSkill(skill, type) {
    if (type === "teaching") {
      setTeaching(prev =>
        prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]
      );
    } else {
      setLearning(prev =>
        prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]
      );
    }
  }

  async function handleSubmit() {
    if (!name || !college || teaching.length === 0 || learning.length === 0) {
      alert("Please fill all fields and select at least one skill each.");
      return;
    }

    setLoading(true);
    const user = auth.currentUser;

    await setDoc(doc(db, "users", user.uid), {
      uid: user.uid,
      name,
      college,
      bio,
      photo: user.photoURL,
      email: user.email,
      teach: teaching,
      learn: learning,
      rating: 0,
      sessionsCompleted: 0,
      badges: [],
      createdAt: new Date().toISOString()
    });

    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-800 py-10 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-2xl p-8 flex flex-col gap-6">

        <h1 className="text-3xl font-bold text-indigo-700 text-center">
          🔁 Build Your Profile
        </h1>
        <p className="text-center text-gray-400 text-sm">
          Tell us who you are and what you want to exchange
        </p>

        {/* Name */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-600">Full Name</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Rahul Sharma"
            className="border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>

        {/* College */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-600">College / University</label>
          <input
            value={college}
            onChange={e => setCollege(e.target.value)}
            placeholder="e.g. ABC Engineering College"
            className="border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>

        {/* Bio */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-600">Short Bio</label>
          <textarea
            value={bio}
            onChange={e => setBio(e.target.value)}
            placeholder="Tell others a bit about yourself..."
            rows={3}
            className="border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
          />
        </div>

        {/* Skills I Can Teach */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-600">
            Skills I Can Teach 🎓
          </label>
          <div className="flex flex-wrap gap-2">
            {SKILLS_LIST.map(skill => (
              <button
                key={skill}
                onClick={() => toggleSkill(skill, "teaching")}
                className={`px-3 py-1.5 rounded-full text-sm border transition ${
                  teaching.includes(skill)
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-white text-gray-600 border-gray-300 hover:border-indigo-400"
                }`}
              >
                {skill}
              </button>
            ))}
          </div>
        </div>

        {/* Skills I Want to Learn */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-600">
            Skills I Want to Learn 📚
          </label>
          <div className="flex flex-wrap gap-2">
            {SKILLS_LIST.map(skill => (
              <button
                key={skill}
                onClick={() => toggleSkill(skill, "learning")}
                className={`px-3 py-1.5 rounded-full text-sm border transition ${
                  learning.includes(skill)
                    ? "bg-purple-600 text-white border-purple-600"
                    : "bg-white text-gray-600 border-gray-300 hover:border-purple-400"
                }`}
              >
                {skill}
              </button>
            ))}
          </div>
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="bg-indigo-700 text-white rounded-xl py-3 font-semibold hover:bg-indigo-800 transition disabled:opacity-50"
        >
          {loading ? "Saving..." : "Save Profile & Continue →"}
        </button>

      </div>
    </div>
  );
}