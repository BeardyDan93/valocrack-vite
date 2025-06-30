
import React, { useState, useEffect } from "react";
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

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_ID",
  appId: "YOUR_APP_ID"
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
      <div>
        <h2>Log in to view your dashboard</h2>
        <input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        /><br/>
        <input
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        /><br/>
        <button onClick={login}>Log In / Sign Up</button>
      </div>
    );
  }

  return (
    <div>
      <h2>Welcome, {user.email}</h2>
      <button onClick={openCheckout}>Upgrade to Premium</button>
      {/* Add more of your app UI here */}
    </div>
  );
}

export default App;
