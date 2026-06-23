"use client";

import { useState } from "react";
import { auth, db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";

const SKILLS_LIST = [
  "Python", "JavaScript", "TypeScript", "Java", "C++", "C", "C#", "Go", "Rust",
  "React", "Next.js", "Vue.js", "Angular", "Node.js", "Express.js",
  "HTML/CSS", "Tailwind CSS", "PHP", "Swift", "Kotlin", "Flutter", "React Native",
  "SQL", "MongoDB", "Firebase", "Git & GitHub", "Docker", "DevOps", "Linux",
  "Machine Learning", "Deep Learning", "Data Analysis", "Data Science",
  "Data Visualization", "Excel", "Power BI", "Tableau", "NLP", "Computer Vision",
  "Pandas/NumPy", "Statistics", "Prompt Engineering",
  "UI Design", "UX Design", "Figma", "Adobe Photoshop", "Adobe Illustrator",
  "Adobe Premiere Pro", "Video Editing", "Graphic Design", "3D Modeling",
  "Animation", "Canva", "Logo Design",
  "Digital Marketing", "SEO", "Content Writing", "Copywriting",
  "Social Media Marketing", "Email Marketing", "Business Strategy",
  "Public Speaking", "Sales", "Negotiation", "Project Management",
  "Entrepreneurship", "Personal Finance", "Stock Market Investing",
  "English Speaking", "Spanish", "French", "German", "Japanese", "Korean",
  "Mandarin Chinese", "Hindi", "Sign Language",
  "Guitar", "Piano", "Singing", "Music Production", "DJing", "Painting",
  "Sketching", "Photography", "Creative Writing", "Poetry",
  "Mathematics", "Physics", "Chemistry", "Biology", "Algebra", "Calculus",
  "Economics", "Accounting", "Academic Writing", "Research Methods",
  "Leadership", "Time Management", "Critical Thinking", "Resume Building",
  "Interview Preparation", "Networking",
  "Yoga", "Meditation", "Fitness Training", "Nutrition", "Chess",
  "Cricket", "Football", "Basketball", "Badminton", "Swimming",
  "Cooking", "Baking", "Gardening", "Interior Design", "Fashion Styling"
];

const LEVELS = ["Beginner", "Intermediate", "Expert"];

const LEVEL_COLORS = {
  Beginner: "bg-green-100 text-green-700 border-green-300",
  Intermediate: "bg-yellow-100 text-yellow-700 border-yellow-300",
  Expert: "bg-red-100 text-red-700 border-red-300"
};

export default function ProfileSetup() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [college, setCollege] = useState("");
  const [bio, setBio] = useState("");
  // teaching is now { skillName: level } object
  const [teaching, setTeaching] = useState({});
  const [learning, setLearning] = useState([]);
  const [customTeach, setCustomTeach] = useState("");
  const [customLearn, setCustomLearn] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  // which skill is showing the level picker
  const [pickingLevel, setPickingLevel] = useState(null);

  function handleTeachClick(skill) {
    if (teaching[skill]) {
      // already selected — remove it
      const updated = { ...teaching };
      delete updated[skill];
      setTeaching(updated);
      setPickingLevel(null);
    } else {
      // show level picker for this skill
      setPickingLevel(skill);
    }
  }

  function selectLevel(skill, level) {
    setTeaching(prev => ({ ...prev, [skill]: level }));
    setPickingLevel(null);
  }

  function toggleLearn(skill) {
    setLearning(prev =>
      prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]
    );
  }

  function addCustomTeach() {
    const value = customTeach.trim();
    if (!value) return;
    setPickingLevel(value);
    setCustomTeach("");
  }

  function addCustomLearn() {
    const value = customLearn.trim();
    if (!value || learning.includes(value)) return;
    setLearning(prev => [...prev, value]);
    setCustomLearn("");
  }

  async function handleSubmit() {
    if (!name || !college || Object.keys(teaching).length === 0 || learning.length === 0) {
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
      // store as array of {skill, level} for easy display
      teach: Object.entries(teaching).map(([skill, level]) => ({ skill, level })),
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

  const teachingSkills = Object.keys(teaching);

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
            placeholder="Type to filter skills..."
            className="border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>

        {/* Level Picker Popup */}
        {pickingLevel && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 flex flex-col gap-3">
            <p className="text-sm font-medium text-indigo-700">
              What's your level in <strong>{pickingLevel}</strong>?
            </p>
            <div className="flex gap-2">
              {LEVELS.map(level => (
                <button
                  key={level}
                  onClick={() => selectLevel(pickingLevel, level)}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium border transition ${LEVEL_COLORS[level]}`}
                >
                  {level}
                </button>
              ))}
            </div>
            <button
              onClick={() => setPickingLevel(null)}
              className="text-xs text-gray-400 hover:text-gray-600 text-center"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Skills I Can Teach */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-600">
            Skills I Can Teach 🎓 <span className="text-gray-400 font-normal">(tap a skill to set your level)</span>
          </label>
          <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-2 border border-gray-100 rounded-xl">
            {filteredSkills.map(skill => (
              <button
                key={skill}
                onClick={() => handleTeachClick(skill)}
                className={`px-3 py-1.5 rounded-full text-sm border transition ${
                  teaching[skill]
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-white text-gray-600 border-gray-300 hover:border-indigo-400"
                }`}
              >
                {skill}
                {teaching[skill] && (
                  <span className="ml-1 text-xs opacity-80">· {teaching[skill]}</span>
                )}
              </button>
            ))}
          </div>

          {/* Custom teach skill */}
          <div className="flex gap-2">
            <input
              value={customTeach}
              onChange={e => setCustomTeach(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addCustomTeach()}
              placeholder="Don't see it? Type your own skill..."
              className="flex-1 border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <button
              onClick={addCustomTeach}
              className="bg-indigo-100 text-indigo-700 px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-200 transition"
            >
              + Add
            </button>
          </div>

          {/* Selected teaching skills */}
          {teachingSkills.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-1">
              {teachingSkills.map(skill => (
                <span
                  key={skill}
                  onClick={() => handleTeachClick(skill)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border cursor-pointer ${LEVEL_COLORS[teaching[skill]]}`}
                >
                  {skill} · {teaching[skill]} ✕
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Skills I Want to Learn */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-600">Skills I Want to Learn 📚</label>
          <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-2 border border-gray-100 rounded-xl">
            {filteredSkills.map(skill => (
              <button
                key={skill}
                onClick={() => toggleLearn(skill)}
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

          <div className="flex gap-2">
            <input
              value={customLearn}
              onChange={e => setCustomLearn(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addCustomLearn()}
              placeholder="Don't see it? Type your own skill..."
              className="flex-1 border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
            <button
              onClick={addCustomLearn}
              className="bg-purple-100 text-purple-700 px-4 py-2 rounded-xl text-sm font-medium hover:bg-purple-200 transition"
            >
              + Add
            </button>
          </div>

          {learning.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-1">
              {learning.map(skill => (
                <span
                  key={skill}
                  onClick={() => toggleLearn(skill)}
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