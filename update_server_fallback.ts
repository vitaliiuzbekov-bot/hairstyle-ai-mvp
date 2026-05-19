import * as fs from 'fs';

let content = fs.readFileSync('server.ts', 'utf8');

// For /api/analyze

const analyzeMatch = content.match(/let jsonStr = "";\s*if \(groqKey\) \{([\s\S]*?)res\.json\(JSON\.parse\(jsonStr \|\| "\{\}"\)\);\n    \} catch/);

if (!analyzeMatch) {
  console.error("Could not find analyze block");
  process.exit(1);
}

let analyzeOld = analyzeMatch[0];

// We want to rewrite the analyze block to cascade
let analyzeNew = `let jsonStr = "";
      let providerErrors: string[] = [];

      if (groqKey && !jsonStr) {
        try {
          const response = await generateWithRetry(() => fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": \`Bearer \${groqKey}\`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              model: "llama-3.2-90b-vision-preview",
              messages: [
                {
                  role: "user",
                  content: [
                    { type: "text", text: "Ты элитный парикмахер-стилист. Внимательно изучи фото.\\nШАГ 1. Оцени ПОЛ человека на фото (male/female).\\nШАГ 2. Оцени текущую ДЛИНУ волос и ГУСТОТУ.\\nШАГ 3. Предложи 3 СОВЕРШЕННО РАЗНЫЕ стрижки.\\nОтвечай СТРОГО в формате JSON: {\\"gender\\": \\"male|female\\", \\"faceShape\\": \\"Овальная\\", \\"hairDensity\\": \\"Густые\\", \\"hairType\\": \\"Прямые\\", \\"recommendations\\": [{\\"name\\": \\"Стрижка\\", \\"description\\": \\"Почему\\", \\"stylingTips\\": \\"Советы\\", \\"imageKeyword\\": \\"english prompt\\"}]}" },
                    { type: "image_url", image_url: { url: \`data:\${mimeType || "image/jpeg"};base64,\${targetBase64}\` } }
                  ]
                }
              ],
              response_format: { type: "json_object" }
            })
          }));
          if (!response.ok) {
             const err = await response.json();
             throw new Error("Groq Error: " + (err.error?.message || response.statusText));
          }
          const data = await response.json();
          jsonStr = data.choices[0].message.content.trim();
        } catch(e: any) {
          providerErrors.push(e.message);
        }
      }

      if (hfToken && !jsonStr) {
        let finalContent = "";
        const modelsToTry = [
          "Qwen/Qwen2.5-VL-72B-Instruct",
          "Qwen/Qwen2.5-VL-7B-Instruct",
          "mistralai/Pixtral-12B-2409",
          "Qwen/Qwen2-VL-7B-Instruct",
          "meta-llama/Llama-3.2-11B-Vision-Instruct"
        ];
        
        let lastHfErr: any;
        for (const m of modelsToTry) {
           try {
             const response = await fetch(\`https://router.huggingface.co/hf-inference/v1/chat/completions\`, {
               method: "POST",
               headers: {
                 "Authorization": \`Bearer \${hfToken}\`,
                 "Content-Type": "application/json"
               },
               body: JSON.stringify({
                 model: m,
                 messages: [
                   {
                     role: "user",
                     content: [
                       { type: "text", text: "Ты элитный парикмахер-стилист. Внимательно изучи фото.\\nШАГ 1. Оцени ПОЛ человека на фото (male/female).\\nШАГ 2. Оцени текущую ДЛИНУ волос и ГУСТОТУ.\\nШАГ 3. Предложи 3 СОВЕРШЕННО РАЗНЫЕ стрижки.\\nОтвечай СТРОГО в формате JSON: {\\"gender\\": \\"male|female\\", \\"faceShape\\": \\"Овальная\\", \\"hairDensity\\": \\"Густые\\", \\"hairType\\": \\"Прямые\\", \\"recommendations\\": [{\\"name\\": \\"Стрижка\\", \\"description\\": \\"Почему\\", \\"stylingTips\\": \\"Советы\\", \\"imageKeyword\\": \\"english prompt\\"}]}" },
                       { type: "image_url", image_url: { url: \`data:\${mimeType || "image/jpeg"};base64,\${targetBase64}\` } }
                     ]
                   }
                 ],
                 max_tokens: 1000
               })
             });
             
             if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(\`Hugging Face Vision Error (\${m}): \` + (err.error || response.statusText));
             }
             const data = await response.json();
             finalContent = data.choices[0].message.content.trim();
             break; // success
           } catch (e: any) {
             console.error("HF Model failed:", e.message);
             lastHfErr = e;
           }
        }
        
        if (finalContent) {
          const match = finalContent.match(/\\{[\\s\\S]*\\}/);
          jsonStr = match ? match[0] : finalContent;
        } else {
          providerErrors.push(lastHfErr?.message || "All HF Vision models failed");
        }
      }

      if (!jsonStr) {
        if (!apiKey) {
          if (providerErrors.length > 0) {
            throw new Error("Analysis failed.\\n" + providerErrors.join("\\n"));
          } else {
            return res.status(401).json({ error: "API-ключ не настроен. Пожалуйста, введите свой API-ключ в настройках (⚙️)." });
          }
        }
        
        try {
          const ai = new GoogleGenAI({ apiKey });
          const response = await generateWithRetry(() =>
            ai.models.generateContent({
              model: "gemini-2.5-flash",
              contents: {
                parts: [
                  {
                    text: "Ты элитный парикмахер-стилист. Внимательно изучи фото.\\n\\nШАГ 1. Оцени ПОЛ человека на фото (male/female).\\nШАГ 2. Оцени текущую ДЛИНУ волос (короткие, средние, длинные) и ГУСТОТУ.\\nШАГ 3. Предложи 3 СОВЕРШЕННО РАЗНЫЕ оптимальные стрижки.\\n\\nАБСОЛЮТНОЕ ПРАВИЛО 1: Описание строго на русском языке.\\nАБСОЛЮТНОЕ ПРАВИЛО 2: ЗАПРЕЩЕНО предлагать стрижки, для которых нужны волосы длиннее, чем есть на фото! Если волосы короткие - предлагать только короткие стрижки. Если волосы редкие - не предлагать объемные прически.\\nАБСОЛЮТНОЕ ПРАВИЛО 3: Все 3 стрижки должны кардинально отличаться друг от друга по стилю.\\n\\nВ поле imageKeyword укажи точное профессиональное название стрижки НА АНГЛИЙСКОМ ЯЗЫКЕ (например: textured french crop, messy pixie cut, classic pompadour, long layered waves).",
                  },
                  {
                    inlineData: {
                      data: targetBase64 || "",
                      mimeType: mimeType || "image/jpeg",
                    },
                  },
                ],
              },
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
                          imageKeyword: {
                            type: Type.STRING,
                            description:
                              "Точное профессиональное название стрижки на английском языке для генерации фото",
                          },
                        },
                        required: ["name", "description", "stylingTips", "imageKeyword"],
                      },
                    },
                  },
                  required: [
                    "gender",
                    "faceShape",
                    "hairDensity",
                    "hairType",
                    "recommendations",
                  ],
                },
              },
            }),
          );

          jsonStr = response.text?.trim() || "";
        } catch(e: any) {
          providerErrors.push("Gemini: " + e.message);
        }
      }
      
      if (!jsonStr) {
         throw new Error("All analysis attempts failed.\\n" + providerErrors.join("\\n"));
      }

      res.json(JSON.parse(jsonStr || "{}"));\n    } catch`;

content = content.replace(analyzeOld, analyzeNew);


// For /api/load-more
const loadMoreMatch = content.match(/let jsonStr = "";\s*if \(groqKey\) \{([\s\S]*?)res\.json\(JSON\.parse\(jsonStr \|\| "\{\}"\)\);\n    \} catch/);
if (!loadMoreMatch) {
  console.error("Could not find load-more block");
  process.exit(1);
}

let loadMoreOld = loadMoreMatch[0];

let loadMoreNew = `let jsonStr = "";
      let providerErrors: string[] = [];
      
      if (groqKey && !jsonStr) {
        try {
          const response = await generateWithRetry(() => fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": \`Bearer \${groqKey}\`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              model: "llama-3.2-90b-vision-preview",
              messages: [
                {
                  role: "user",
                  content: [
                    { type: "text", text: \`Ты элитный парикмахер-стилист. Внимательно изучи фото.\\nШАГ 1. Оцени ПОЛ (male/female), текущую ДЛИНУ волос и ГУСТОТУ.\\nШАГ 2. Предложи 3 НОВЫЕ СОВЕРШЕННО РАЗНЫЕ стрижки.\\nОтвечай СТРОГО в формате JSON: {\\"recommendations\\": [{\\"name\\": \\"Стрижка\\", \\"description\\": \\"Почему\\", \\"stylingTips\\": \\"Советы\\", \\"imageKeyword\\": \\"english prompt\\"}]}\\nИсключить: \${existingNames}\` },
                    { type: "image_url", image_url: { url: \`data:\${mimeType || "image/jpeg"};base64,\${targetBase64}\` } }
                  ]
                }
              ],
              response_format: { type: "json_object" }
            })
          }));
          if (!response.ok) {
             const err = await response.json().catch(() => ({}));
             throw new Error("Groq Error: " + (err.error?.message || response.statusText));
          }
          const data = await response.json();
          jsonStr = data.choices[0].message.content.trim();
        } catch(e: any) {
          providerErrors.push(e.message);
        }
      }

      if (hfToken && !jsonStr) {
        let finalContent = "";
        const modelsToTry = [
          "Qwen/Qwen2.5-VL-72B-Instruct",
          "Qwen/Qwen2.5-VL-7B-Instruct",
          "mistralai/Pixtral-12B-2409",
          "Qwen/Qwen2-VL-7B-Instruct",
          "meta-llama/Llama-3.2-11B-Vision-Instruct"
        ];
        
        let lastHfErr: any;
        for (const m of modelsToTry) {
           try {
             const response = await fetch(\`https://router.huggingface.co/hf-inference/v1/chat/completions\`, {
               method: "POST",
               headers: {
                 "Authorization": \`Bearer \${hfToken}\`,
                 "Content-Type": "application/json"
               },
               body: JSON.stringify({
                 model: m,
                 messages: [
                   {
                     role: "user",
                     content: [
                       { type: "text", text: \`Ты элитный парикмахер-стилист. Внимательно изучи фото.\\nШАГ 1. Оцени ПОЛ (male/female), текущую ДЛИНУ волос и ГУСТОТУ.\\nШАГ 2. Предложи 3 НОВЫЕ СОВЕРШЕННО РАЗНЫЕ стрижки.\\nОтвечай СТРОГО в формате JSON: {\\"recommendations\\": [{\\"name\\": \\"Стрижка\\", \\"description\\": \\"Почему\\", \\"stylingTips\\": \\"Советы\\", \\"imageKeyword\\": \\"english prompt\\"}]}\\nИсключить: \${existingNames}\` },
                       { type: "image_url", image_url: { url: \`data:\${mimeType || "image/jpeg"};base64,\${targetBase64}\` } }
                     ]
                   }
                 ],
                 max_tokens: 1000
               })
             });
             
             if (!response.ok) {
                 const err = await response.json().catch(() => ({}));
                 throw new Error(\`Hugging Face Vision Error (\${m}): \` + (err.error || response.statusText));
             }
             const data = await response.json();
             finalContent = data.choices[0].message.content.trim();
             break;
           } catch(e: any) {
             lastHfErr = e;
           }
        }
        
        if (finalContent) {
           const match = finalContent.match(/\\{[\\s\\S]*\\}/);
           jsonStr = match ? match[0] : finalContent;
        } else {
           providerErrors.push(lastHfErr?.message || "All HF Vision models failed");
        }
      }

      if (!jsonStr) {
        if (!apiKey) {
           if (providerErrors.length > 0) {
             throw new Error("Analysis failed.\\n" + providerErrors.join("\\n"));
           } else {
             return res.status(401).json({ error: "API-ключ не настроен. Пожалуйста, введите свой API-ключ в настройках (⚙️)." });
           }
        }
        try {
          const ai = new GoogleGenAI({ apiKey });
          const response = await generateWithRetry(() =>
            ai.models.generateContent({
              model: "gemini-2.5-flash",
              contents: {
                parts: [
                  {
                    text: \`Ты элитный парикмахер-стилист. Внимательно изучи фото.\\n\\nШАГ 1. Оцени ПОЛ (male/female), текущую ДЛИНУ волос и ГУСТОТУ.\\nШАГ 2. Предложи 3 НОВЫЕ СОВЕРШЕННО РАЗНЫЕ стрижки.\\n\\nАБСОЛЮТНОЕ ПРАВИЛО 1: Описание строго на русском языке.\\nАБСОЛЮТНОЕ ПРАВИЛО 2: ЗАПРЕЩЕНО предлагать стрижки, для которых нужны волосы длиннее, чем есть на фото! Если волосы короткие - только короткие.\\nАБСОЛЮТНОЕ ПРАВИЛО 3: Исключить следующие стрижки, они уже были предложены: \${existingNames}.\\nАБСОЛЮТНОЕ ПРАВИЛО 4: Все 3 стрижки должны кардинально отличаться друг от друга.\\n\\nВ поле imageKeyword укажи точное профессиональное название стрижки НА АНГЛИЙСКОМ ЯЗЫКЕ (например: textured french crop, messy pixie cut, classic pompadour, long layered waves, etc.).\`,
                  },
                  {
                    inlineData: {
                      data: targetBase64 || "",
                      mimeType: mimeType || "image/jpeg",
                    },
                  },
                ],
              },
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
                          imageKeyword: {
                            type: Type.STRING,
                            description:
                              "Точное профессиональное название стрижки на английском языке для генерации фото",
                          },
                        },
                        required: [
                          "name",
                          "description",
                          "stylingTips",
                          "imageKeyword",
                        ],
                      },
                    },
                  },
                  required: ["recommendations"],
                },
              },
            }),
          );

          jsonStr = response.text?.trim() || "";
        } catch(e: any) {
          providerErrors.push("Gemini: " + e.message);
        }
      }
      res.json(JSON.parse(jsonStr || "{}"));\n    } catch`;

content = content.replace(loadMoreOld, loadMoreNew);
fs.writeFileSync('server.ts', content);
