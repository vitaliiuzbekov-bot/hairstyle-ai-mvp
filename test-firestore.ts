import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";
import { readFileSync } from "fs";

const firebaseConfig = JSON.parse(readFileSync("./firebase-applet-config.json", "utf8"));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId); // Use specific DB check
const auth = getAuth(app);

async function run() {
  try {
    const userCredential = await signInAnonymously(auth);
    const user = userCredential.user;
    console.log("Signed in anonymously. UID:", user.uid);
    
    const userRef = doc(db, "users", user.uid);
    await setDoc(userRef, { test: "data" }, { merge: true });
    console.log("Write success!");
    
    const snap = await getDoc(userRef);
    console.log("Read success:", snap.data());
    
    process.exit(0);
  } catch (err) {
    console.error("Test failed:", err);
    process.exit(1);
  }
}
run();
