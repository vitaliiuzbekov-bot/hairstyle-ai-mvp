import { GoogleGenAI, Type } from "@google/genai";
import fs from "fs";

async function run() {
  const apiKey = "AIzaSyCXHhfhg8Mhf5MM6gWLgRwz3tnVrmfuQn0"; // Or the user's custom key? I can't know it. But I'll use a local mock or just check if it compiles.
  // We can just check with a dummy key and observe the exact error. We can also test with a small base64.
  const ai = new GoogleGenAI({ apiKey: "AIzaSyDUMMYDUMMYDUMMYDUMMYDUMMYDUMMYDUMMY" });

  try {
     const res = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: {
            parts: [
              {text: "hello"}
            ]
          }
     });
     console.log(res);
  } catch (err: any) {
      console.error("Error:", err.message);
  }
}

run();
