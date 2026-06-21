"use client";

import { useState } from "react";
import { auth, db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";

const SKILLS_LIST = [
  // Programming & Dev
  "Python", "JavaScript", "TypeScript", "Java", "C++", "C", "C#", "Go", "Rust",
  "React", "Next.js", "Vue.js", "Angular", "Node.js", "Express.js",
  "HTML/CSS", "Tailwind CSS", "PHP", "Swift", "Kotlin", "Flutter", "React Native",
  "SQL", "MongoDB", "Firebase", "Git & GitHub", "Docker", "DevOps", "Linux",

  // Data & AI
  "Machine Learning", "Deep Learning", "Data Analysis", "Data Science",
  "Data Visualization", "Excel", "Power BI", "Tableau", "NLP", "Computer Vision",
  "Pandas/NumPy", "Statistics", "Prompt Engineering",

  // Design & Creative
  "UI Design", "UX Design", "Figma", "Adobe Photoshop", "Adobe Illustrator",
  "Adobe Premiere Pro", "Video Editing", "Graphic Design", "3D Modeling",
  "Animation", "Canva", "Logo Design",

  // Business & Marketing
  "Digital Marketing", "SEO", "Content Writing", "Copywriting",
  "Social Media Marketing", "Email Marketing", "Business Strategy",
  "Public Speaking", "Sales", "Negotiation", "Project Management",
  "Entrepreneurship", "Personal Finance", "Stock Market Investing",

  // Languages
  "English Speaking", "Spanish", "French", "German", "Japanese", "Korean",
  "Mandarin Chinese", "Hindi", "Sign Language",

  // Music & Arts
  "Guitar", "Piano", "Singing", "Music Production", "DJing", "Painting",
  "Sketching", "Photography", "Creative Writing", "Poetry",

  // Academics
  "Mathematics", "Physics", "Chemistry", "Biology", "Algebra", "Calculus",
  "Economics", "Accounting", "Academic Writing", "Research Methods",

  // Soft Skills
  "Leadership", "Time Management", "Critical Thinking", "Resume Building",
  "Interview Preparation", "Networking",

  // Sports & Wellness
  "Yoga", "Meditation", "Fitness Training", "Nutrition", "Chess",
  "Cricket", "Football", "Basketball", "Badminton", "Swimming",

  // Cooking & Lifestyle
  "Cooking", "Baking", "Gardening", "Interior Design", "Fashion Styling"
];

export default function ProfileSetup() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [college, setCollege] = useState("");
  const [bio, setBio] = useState("");
  const [teaching, setTeaching] = useState([]);
  const [learning, setLearning] = useState([]);
  const [customTeach, setCustomTeach] = useState("");
  const [customLearn, setCustomLearn] = useState("");
  const [search, setSearch] = useState("");
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

  function addCustomSkill(type) {
    const value = type === "teaching" ? customTeach.trim() : customLearn.trim();
    if (!value) return;

    if (type === "teaching") {
      if (!teaching.includes(value)) setTeaching(prev => [...prev, value]);
      setCustomTeach("");
    } else {
      if (!learning.includes(value)) setLearning(prev => [...prev, value]);
      setCustomLearn("");
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
      photoBase64: "",
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

  const filteredSkills = SKILLS_LIST.filter(s =>
    s.toLowerCase().includes(search.toLowerCase())
  );

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

        {/* Skill Search */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-600">Search Skills</label>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Type to filter the skill list below..."
            className="border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>

        {/* Skills I Can Teach */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-600">
            Skills I Can Teach 🎓
          </label>
          <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-2 border border-gray-100 rounded-xl">
            {filteredSkills.map(skill => (
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

          {/* Custom skill add */}
          <div className="flex gap-2">
            <input
              value={customTeach}
              onChange={e => setCustomTeach(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addCustomSkill("teaching")}
              placeholder="Don't see it? Type your own skill..."
              className="flex-1 border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <button
              onClick={() => addCustomSkill("teaching")}
              className="bg-indigo-100 text-indigo-700 px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-200 transition"
            >
              + Add
            </button>
          </div>

          {/* Selected teaching skills */}
          {teaching.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-1">
              {teaching.map(skill => (
                <span
                  key={skill}
                  onClick={() => toggleSkill(skill, "teaching")}
                  className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-xs font-medium border border-indigo-200 cursor-pointer"
                >
                  {skill} ✕
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Skills I Want to Learn */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-600">
            Skills I Want to Learn 📚
          </label>
          <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-2 border border-gray-100 rounded-xl">
            {filteredSkills.map(skill => (
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

          {/* Custom skill add */}
          <div className="flex gap-2">
            <input
              value={customLearn}
              onChange={e => setCustomLearn(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addCustomSkill("learning")}
              placeholder="Don't see it? Type your own skill..."
              className="flex-1 border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
            <button
              onClick={() => addCustomSkill("learning")}
              className="bg-purple-100 text-purple-700 px-4 py-2 rounded-xl text-sm font-medium hover:bg-purple-200 transition"
            >
              + Add
            </button>
          </div>

          {/* Selected learning skills */}
          {learning.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-1">
              {learning.map(skill => (
                <span
                  key={skill}
                  onClick={() => toggleSkill(skill, "learning")}
                  className="bg-purple-50 text-purple-700 px-3 py-1 rounded-full text-xs font-medium border border-purple-200 cursor-pointer"
                >
                  {skill} ✕
                </span>
              ))}
            </div>
          )}
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