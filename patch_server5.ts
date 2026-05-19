import * as fs from 'fs';
import { Type } from "@google/genai";

let code = fs.readFileSync('server.ts', 'utf8');

if (!code.includes('import { GoogleGenAI, Type } from "@google/genai";')) {
  code = `import { GoogleGenAI, Type } from "@google/genai";\n` + code;
}

const analyzeBlockStart = code.indexOf('app.post("/api/analyze", async (req, res) => {');
const analyzeBlockEnd = code.indexOf('});', code.indexOf('res.status(500).json({ error: err.message || "Ошибка при анализе фото" });', analyzeBlockStart)) + 3;

if (analyzeBlockStart !== -1 && analyzeBlockEnd > analyzeBlockStart) {
  const newAnalyze = `app.post("/api/analyze", async (req, res) => {
    try {
      const { imageBase64, imageUrl, mimeType } = req.body;
      const targetBase64 = await fetchImageAsBase64(imageUrl, imageBase64);
      if (!targetBase64) {
        return res.status(400).json({ error: "No image provided" });
      }

      let ai;
      try {
        ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      } catch (err: any) {
        throw new Error("GEMINI_API_KEY is missing or invalid on the server.");
      }

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          {
             role: "user",
             parts: [
               { text: "Ты элитный парикмахер-стилист. Внимательно изучи фото.\\nШАГ 1. Оцени ПОЛ человека на фото (male/female).\\nШАГ 2. Оцени текущую ДЛИНУ волос и ГУСТОТУ.\\nШАГ 3. Предложи 3 СОВЕРШЕННО РАЗНЫЕ стрижки.\\nОтвечай СТРОГО в формате JSON." },
               { inlineData: { data: targetBase64, mimeType: mimeType || "image/jpeg" } }
             ]
          }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              gender: { type: Type.STRING },
              faceShape: { type: Type.STRING },
              hairDensity: { type: Type.STRING },
              hairType: { type: Type.STRING },
              recommendations: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    description: { type: Type.STRING },
                    stylingTips: { type: Type.STRING },
                    imageKeyword: { type: Type.STRING }
                  },
                  required: ["name", "description", "stylingTips", "imageKeyword"]
                }
              }
            },
            required: ["gender", "faceShape", "hairDensity", "hairType", "recommendations"]
          }
        }
      });
      
      const jsonStr = response.text?.trim() || "{}";
      res.json(JSON.parse(jsonStr));
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message || "Ошибка при анализе фото" });
    }
  });`;
  code = code.substring(0, analyzeBlockStart) + newAnalyze + code.substring(analyzeBlockEnd);
}

const loadMoreStart = code.indexOf('app.post("/api/load-more", async (req, res) => {');
const loadMoreEnd = code.indexOf('});', code.indexOf('res.status(500).json({ error: err.message || "Ошибка от сервера при генерации вариантов." });', loadMoreStart)) + 3;

if (loadMoreStart !== -1 && loadMoreEnd > loadMoreStart) {
  const newLoadMore = `app.post("/api/load-more", async (req, res) => {
    try {
      const { imageBase64, imageUrl, mimeType, existingNames } = req.body;
      const targetBase64 = await fetchImageAsBase64(imageUrl, imageBase64);

      let ai;
      try {
        ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      } catch (err: any) {
        throw new Error("GEMINI_API_KEY is missing or invalid on the server.");
      }

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
           {
              role: "user",
              parts: [
                { text: \`Ты элитный парикмахер-стилист. Внимательно изучи фото и предложи еще 3 СОВЕРШЕННО НОВЫЕ стрижки. Избегай следующих стилей: \${existingNames}.\\nВыдай ответ СТРОГО в формате JSON array.\` },
                { inlineData: { data: targetBase64 || "", mimeType: mimeType || "image/jpeg" } }
              ]
           }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
               recommendations: {
                 type: Type.ARRAY,
                 items: {
                   type: Type.OBJECT,
                   properties: {
                     name: { type: Type.STRING },
                     description: { type: Type.STRING },
                     stylingTips: { type: Type.STRING },
                     imageKeyword: { type: Type.STRING }
                   },
                   required: ["name", "description", "stylingTips", "imageKeyword"]
                 }
               }
            },
            required: ["recommendations"]
          }
        }
      });
      
      const jsonStr = response.text?.trim() || "{}";
      res.json(JSON.parse(jsonStr));
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message || "Ошибка от сервера при генерации вариантов." });
    }
  });`;
  code = code.substring(0, loadMoreStart) + newLoadMore + code.substring(loadMoreEnd);
}

fs.writeFileSync('server.ts', code);
