"use client";

import { useToast } from "@/components/Toast";
import { useEffect, useState, useRef } from "react";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
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

// --- Availability options ---
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const TIME_SLOTS = [
  "Early Morning (6–9 AM)",
  "Morning (9 AM–12 PM)",
  "Afternoon (12–4 PM)",
  "Evening (4–8 PM)",
  "Night (8–11 PM)",
];

const MAX_DIMENSION = 400;
const JPEG_QUALITY = 0.7;

export default function EditProfile() {
  const router = useRouter();
  const showToast = useToast();
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const [myUid, setMyUid] = useState(null);
  const [name, setName] = useState("");
  const [college, setCollege] = useState("");
  const [bio, setBio] = useState("");
  const [teaching, setTeaching] = useState({});
  const [learning, setLearning] = useState([]);
  const [customTeach, setCustomTeach] = useState("");
  const [customLearn, setCustomLearn] = useState("");
  const [search, setSearch] = useState("");
  const [photoPreview, setPhotoPreview] = useState("");
  const [cameraOpen, setCameraOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pickingLevel, setPickingLevel] = useState(null);

  // --- Availability state ---
  const [availableDays, setAvailableDays] = useState([]);
  const [availableSlots, setAvailableSlots] = useState([]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (!firebaseUser) { router.push("/"); return; }
      setMyUid(firebaseUser.uid);

      const docSnap = await getDoc(doc(db, "users", firebaseUser.uid));
      if (docSnap.exists()) {
        const data = docSnap.data();
        setName(data.name || "");
        setCollege(data.college || "");
        setBio(data.bio || "");

        const rawTeach = data.teach || [];
        if (rawTeach.length > 0 && typeof rawTeach[0] === "string") {
          const converted = {};
          rawTeach.forEach(s => { converted[s] = "Intermediate"; });
          setTeaching(converted);
        } else {
          const converted = {};
          rawTeach.forEach(({ skill, level }) => { converted[skill] = level; });
          setTeaching(converted);
        }

        setLearning(data.learn || []);
        setPhotoPreview(data.photoBase64 || firebaseUser.photoURL || "");

        // Load saved availability
        setAvailableDays(data.availableDays || []);
        setAvailableSlots(data.availableSlots || []);
      } else {
        router.push("/profile-setup");
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    return () => stopCamera();
  }, []);

  // ---- Teaching skill handlers ----
  function handleTeachClick(skill) {
    if (teaching[skill]) {
      const updated = { ...teaching };
      delete updated[skill];
      setTeaching(updated);
      setPickingLevel(null);
    } else {
      setPickingLevel(skill);
    }
  }

  function selectLevel(skill, level) {
    setTeaching(prev => ({ ...prev, [skill]: level }));
    setPickingLevel(null);
  }

  function addCustomTeach() {
    const value = customTeach.trim();
    if (!value) return;
    setPickingLevel(value);
    setCustomTeach("");
  }

  // ---- Learning skill handlers ----
  function toggleLearn(skill) {
    setLearning(prev =>
      prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]
    );
  }

  function addCustomLearn() {
    const value = customLearn.trim();
    if (!value || learning.includes(value)) return;
    setLearning(prev => [...prev, value]);
    setCustomLearn("");
  }

  // ---- Availability handlers ----
  function toggleDay(day) {
    setAvailableDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  }

  function toggleSlot(slot) {
    setAvailableSlots(prev =>
      prev.includes(slot) ? prev.filter(s => s !== slot) : [...prev, slot]
    );
  }

  // ---- Photo handlers ----
  function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const base64 = resizeImageToBase64(img);
        setPhotoPreview(base64);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  }

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      setCameraOpen(true);
      setTimeout(() => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      }, 100);
    } catch {
      showToast("Couldn't access camera. Please check browser permissions.", "error");
    }
  }

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraOpen(false);
  }

  function capturePhoto() {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const img = new Image();
    img.onload = () => {
      const base64 = resizeImageToBase64(img);
      setPhotoPreview(base64);
      stopCamera();
    };
    img.src = canvas.toDataURL("image/jpeg");
  }

  function resizeImageToBase64(img) {
    let { width, height } = img;
    if (width > height && width > MAX_DIMENSION) {
      height = Math.round((height * MAX_DIMENSION) / width);
      width = MAX_DIMENSION;
    } else if (height > MAX_DIMENSION) {
      width = Math.round((width * MAX_DIMENSION) / height);
      height = MAX_DIMENSION;
    }
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, width, height);
    return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
  }

  function removePhoto() {
    setPhotoPreview("");
  }

  // ---- Save ----
  async function handleSave() {
    if (!name || !college || Object.keys(teaching).length === 0 || learning.length === 0) {
      showToast("Please fill all fields and select at least one skill each.", "error");
      return;
    }
    setSaving(true);
    await updateDoc(doc(db, "users", myUid), {
      name,
      college,
      bio,
      teach: Object.entries(teaching).map(([skill, level]) => ({ skill, level })),
      learn: learning,
      photoBase64: photoPreview || "",
      availableDays,
      availableSlots,
    });
    setSaving(false);
    showToast("Profile updated! ✅");
    router.push("/dashboard");
  }

  const filteredSkills = SKILLS_LIST.filter(s =>
    s.toLowerCase().includes(search.toLowerCase())
  );

  const teachingSkills = Object.keys(teaching);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-indigo-600 animate-pulse text-lg">Loading your profile...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-800 py-10 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-2xl p-8 flex flex-col gap-6">

        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-indigo-700">✏️ Edit Profile</h1>
          <button
            onClick={() => router.push("/dashboard")}
            className="text-sm text-gray-400 hover:text-gray-600"
          >
            ← Back
          </button>
        </div>

        {/* Profile Photo */}
        <div className="flex flex-col items-center gap-4 py-4 border-b border-gray-100">
          <div className="w-28 h-28 rounded-full bg-indigo-100 flex items-center justify-center overflow-hidden border-4 border-indigo-200">
            {photoPreview ? (
              <img src={photoPreview} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <span className="text-4xl font-bold text-indigo-400">{name?.charAt(0) || "?"}</span>
            )}
          </div>

          {cameraOpen ? (
            <div className="flex flex-col items-center gap-3">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-64 h-48 rounded-xl bg-black object-cover"
                style={{ transform: "scaleX(-1)" }}
              />
              <div className="flex gap-2">
                <button onClick={capturePhoto} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 transition">
                  📸 Capture
                </button>
                <button onClick={stopCamera} className="border border-gray-300 text-gray-500 px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-50 transition">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2 flex-wrap justify-center">
              <button onClick={() => fileInputRef.current?.click()} className="bg-indigo-50 text-indigo-700 px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-100 transition">
                📁 Upload Photo
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
              <button onClick={startCamera} className="bg-purple-50 text-purple-700 px-4 py-2 rounded-xl text-sm font-medium hover:bg-purple-100 transition">
                📷 Use Camera
              </button>
              {photoPreview && (
                <button onClick={removePhoto} className="bg-red-50 text-red-500 px-4 py-2 rounded-xl text-sm font-medium hover:bg-red-100 transition">
                  ✕ Remove
                </button>
              )}
            </div>
          )}
        </div>

        {/* Name */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-600">Full Name</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            className="border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>

        {/* College */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-600">College / University</label>
          <input
            value={college}
            onChange={e => setCollege(e.target.value)}
            className="border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>

        {/* Bio */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-600">Short Bio</label>
          <textarea
            value={bio}
            onChange={e => setBio(e.target.value)}
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
            <button onClick={() => setPickingLevel(null)} className="text-xs text-gray-400 hover:text-gray-600 text-center">
              Cancel
            </button>
          </div>
        )}

        {/* Skills I Can Teach */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-600">
            Skills I Can Teach 🎓 <span className="text-gray-400 font-normal">(tap to set your level)</span>
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
                {teaching[skill] && <span className="ml-1 text-xs opacity-80">· {teaching[skill]}</span>}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={customTeach}
              onChange={e => setCustomTeach(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addCustomTeach()}
              placeholder="Don't see it? Type your own skill..."
              className="flex-1 border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <button onClick={addCustomTeach} className="bg-indigo-100 text-indigo-700 px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-200 transition">
              + Add
            </button>
          </div>
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
            <button onClick={addCustomLearn} className="bg-purple-100 text-purple-700 px-4 py-2 rounded-xl text-sm font-medium hover:bg-purple-200 transition">
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

        {/* ---- AVAILABILITY (new section) ---- */}
        <div className="flex flex-col gap-4 border-t border-gray-100 pt-4">
          <div>
            <label className="text-sm font-medium text-gray-600">📅 Available Days</label>
            <p className="text-xs text-gray-400 mt-0.5">Which days are you free for sessions?</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {DAYS.map(day => (
              <button
                key={day}
                onClick={() => toggleDay(day)}
                className={`px-3 py-1.5 rounded-full text-sm border transition ${
                  availableDays.includes(day)
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-white text-gray-600 border-gray-300 hover:border-indigo-400"
                }`}
              >
                {day.slice(0, 3)}
              </button>
            ))}
          </div>

          <div>
            <label className="text-sm font-medium text-gray-600">🕐 Preferred Time Slots</label>
            <p className="text-xs text-gray-400 mt-0.5">When during the day works best for you?</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {TIME_SLOTS.map(slot => (
              <button
                key={slot}
                onClick={() => toggleSlot(slot)}
                className={`px-3 py-1.5 rounded-full text-sm border transition ${
                  availableSlots.includes(slot)
                    ? "bg-purple-600 text-white border-purple-600"
                    : "bg-white text-gray-600 border-gray-300 hover:border-purple-400"
                }`}
              >
                {slot}
              </button>
            ))}
          </div>
        </div>

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-indigo-700 text-white rounded-xl py-3 font-semibold hover:bg-indigo-800 transition disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Changes ✓"}
        </button>

      </div>
    </div>
  );
}