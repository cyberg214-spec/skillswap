"use client";

import { useEffect, useState, useRef } from "react";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
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

const MAX_DIMENSION = 400;
const JPEG_QUALITY = 0.7;

export default function EditProfile() {
  const router = useRouter();
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const [myUid, setMyUid] = useState(null);
  const [name, setName] = useState("");
  const [college, setCollege] = useState("");
  const [bio, setBio] = useState("");
  const [teaching, setTeaching] = useState([]);
  const [learning, setLearning] = useState([]);
  const [customTeach, setCustomTeach] = useState("");
  const [customLearn, setCustomLearn] = useState("");
  const [search, setSearch] = useState("");
  const [photoPreview, setPhotoPreview] = useState("");
  const [cameraOpen, setCameraOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
        setTeaching(data.teach || []);
        setLearning(data.learn || []);
        setPhotoPreview(data.photoBase64 || firebaseUser.photoURL || "");
      } else {
        router.push("/profile-setup");
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Stop camera stream when leaving the page
  useEffect(() => {
    return () => stopCamera();
  }, []);

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

  // ---- Photo: Upload from device ----
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

  // ---- Photo: Capture from camera ----
  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      setCameraOpen(true);
      // Wait for video element to mount, then attach
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (err) {
      alert("Couldn't access camera. Please check browser permissions.");
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

    // Flip horizontally so the saved photo matches the mirrored preview
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

  // Resize any loaded image element down to MAX_DIMENSION and return compressed base64
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

  async function handleSave() {
    if (!name || !college || teaching.length === 0 || learning.length === 0) {
      alert("Please fill all fields and select at least one skill each.");
      return;
    }

    setSaving(true);
    await updateDoc(doc(db, "users", myUid), {
      name,
      college,
      bio,
      teach: teaching,
      learn: learning,
      photoBase64: photoPreview || ""
    });
    setSaving(false);
    alert("Profile updated! ✅");
    router.push("/dashboard");
  }

  const filteredSkills = SKILLS_LIST.filter(s =>
    s.toLowerCase().includes(search.toLowerCase())
  );

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
              <span className="text-4xl font-bold text-indigo-400">
                {name?.charAt(0) || "?"}
              </span>
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
                <button
                  onClick={capturePhoto}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 transition"
                >
                  📸 Capture
                </button>
                <button
                  onClick={stopCamera}
                  className="border border-gray-300 text-gray-500 px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2 flex-wrap justify-center">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="bg-indigo-50 text-indigo-700 px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-100 transition"
              >
                📁 Upload Photo
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                onClick={startCamera}
                className="bg-purple-50 text-purple-700 px-4 py-2 rounded-xl text-sm font-medium hover:bg-purple-100 transition"
              >
                📷 Use Camera
              </button>
              {photoPreview && (
                <button
                  onClick={removePhoto}
                  className="bg-red-50 text-red-500 px-4 py-2 rounded-xl text-sm font-medium hover:bg-red-100 transition"
                >
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

        {/* Skills I Can Teach */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-600">Skills I Can Teach 🎓</label>
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
          <label className="text-sm font-medium text-gray-600">Skills I Want to Learn 📚</label>
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