import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

import { initializeApp } from "firebase/app";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from "firebase/auth";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion
} from "firebase/firestore";

// ✅ Use Vercel environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

function App() {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [downloadHistory, setDownloadHistory] = useState([]);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStatus, setExportStatus] = useState("");
  const [selectedClip, setSelectedClip] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user);
        const ref = doc(db, "users", user.uid);
        const docSnap = await getDoc(ref);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.downloadHistory) setDownloadHistory(data.downloadHistory);
        }
      } else {
        setUser(null);
      }
    });
    return () => unsubscribe();
  }, []);

  const login = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      await createUserWithEmailAndPassword(auth, email, password);
    }
  };

  const saveToFirestore = async (clip) => {
    if (!user) return;
    const ref = doc(db, "users", user.uid);
    const docSnap = await getDoc(ref);
    if (!docSnap.exists()) {
      await setDoc(ref, { downloadHistory: [clip] });
    } else {
      await updateDoc(ref, {
        downloadHistory: arrayUnion(clip)
      });
    }
  };

  const handleExport = (type) => {
    setExportStatus("Exporting...");
    setExportProgress(0);
    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      setExportProgress(progress);
      if (progress >= 100) {
        clearInterval(interval);
        setExportStatus(
          type === "premium"
            ? "✅ Exported Premium Clip (No Watermark)!"
            : "✅ Exported Clip with Watermark!"
        );
        const dummyBlob = new Blob([`This is a ${type} clip.`], { type: "text/plain" });
        const dummyUrl = URL.createObjectURL(dummyBlob);

        const clip = {
          ...selectedClip,
          type,
          timestamp: new Date().toLocaleString(),
          downloadUrl: dummyUrl
        };

        setDownloadHistory((prev) => [...prev, clip]);
        saveToFirestore(clip);

        setTimeout(() => {
          setExportStatus("");
          setExportProgress(0);
        }, 3000);
      }
    }, 150);
  };

  const openCheckout = () => {
    window.open("https://buy.stripe.com/test_00g6o5fU7eOM62w8ww", "_blank");
  };

  if (!user) {
    return (
      <div className="p-6 space-y-4">
        <h2 className="text-xl font-bold">Log in to view your dashboard</h2>
        <Input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Button onClick={login}>Log In / Sign Up</Button>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Welcome, {user.email}</h2>
      <Button onClick={openCheckout} className="mb-6">Upgrade to Premium</Button>

      <div className="space-y-4">
        <h3 className="font-semibold">Download History</h3>
        {downloadHistory.map((clip, idx) => (
          <div key={idx} className="border rounded p-2">
            <p>Type: {clip.type}</p>
            <p>Time: {clip.timestamp}</p>
            <a href={clip.downloadUrl} download>⬇ Download</a>
          </div>
        ))}
        {exportStatus && (
          <>
            <p>{exportStatus}</p>
            <Progress value={exportProgress} />
          </>
        )}
      </div>
    </div>
  );
}

export default App;
