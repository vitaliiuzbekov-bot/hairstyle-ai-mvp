import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";
import { readFileSync } from "fs";

const firebaseConfig = JSON.parse(readFileSync("./firebase-applet-config.json", "utf8"));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app); // NO DATABASE ID

async function run() {
  try {
    const docRef = doc(db, "test", "default");
    await setDoc(docRef, { hello: "world" });
    console.log("Write success!");
    
    const snap = await getDoc(docRef);
    console.log("Read success:", snap.data());
    
    process.exit(0);
  } catch (err) {
    console.error("Test failed:", err);
    process.exit(1);
  }
}
run();
