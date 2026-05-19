import { GoogleGenAI } from "@google/genai";

async function test() {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  const ai = new GoogleGenAI({ apiKey });
  try {
     console.log("Testing imagen-4.0-generate-001...");
     const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: 'A robot holding a red skateboard',
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/jpeg',
          aspectRatio: '1:1',
        },
    });
    console.log("Imagen works:", response.generatedImages?.length > 0 ? "Got images" : "No images");
  } catch (err: any) {
     console.error("Imagen failed:", err.message);
  }
}
test();
