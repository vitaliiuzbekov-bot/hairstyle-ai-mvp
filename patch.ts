const fs = require('fs');

let serverTs = fs.readFileSync('server.ts', 'utf-8');

serverTs = serverTs.replace(/app\.post\("\/api\/analyze", async \(req, res\) => {/, `app.post("/api/analyze", async (req, res) => {
    try {
      const apiKey = getApiKeyFromRequest(req);
      const groqKey = req.headers["x-groq-key"] as string;
      const hfToken = req.headers["x-hf-token"] as string;
      
      const { imageBase64, imageUrl, mimeType } = req.body;
      const targetBase64 = await fetchImageAsBase64(imageUrl, imageBase64);
      if (!targetBase64) {
        return res.status(400).json({ error: "No image provided" });
      }

      let jsonStr = "";
      if (groqKey) {
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
                  { type: "text", text: "Ты элитный парикмахер-стилист. Внимательно изучи фото.\\nШАГ 1. Оцени ПОЛ человека на фото (male/female).\\nШАГ 2. Оцени текущую ДЛИНУ волос и ГУСТОТУ.\\nШАГ 3. Предложи 3 СОВЕРШЕННО РАЗНЫЕ стрижки.\\nОтвечай СТРОГО в формате JSON: {\\"gender\\": \\"male\\", \\"faceShape\\": \\"Овальная\\", \\"hairDensity\\": \\"Густые\\", \\"hairType\\": \\"Прямые\\", \\"recommendations\\": [{\\"name\\": \\"Стрижка\\", \\"description\\": \\"Почему\\", \\"stylingTips\\": \\"Советы\\", \\"imageKeyword\\": \\"english prompt\\"}]}" },
                  { type: "image_url", image_url: { url: \`data:\${mimeType || "image/jpeg"};base64,\${targetBase64}\` } }
                ]
              }
            ],
            response_format: { type: "json_object" }
          })
        }));
        if (!response.ok) {
           const err = await response.json();
           throw new Error(err.error?.message || "Groq Error");
        }
        const data = await response.json();
        jsonStr = data.choices[0].message.content.trim();
      } else {
        if (!apiKey) return res.status(401).json({ error: "API-ключ не настроен." });
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
                    data: targetBase64,
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
                  gender: {
                    type: Type.STRING,
                    description: "Пол человека на фото: 'male' или 'female'",
                  },
                  faceShape: {
                    type: Type.STRING,
                    description: "Например: Овальная, Квадратная, Круглая",
                  },
                  hairDensity: {
                    type: Type.STRING,
                    description: "Например: Густые, Тонкие, Средние",
                  },
                  hairType: {
                    type: Type.STRING,
                    description: "Например: Прямые, Волнистые, Кудрявые",
                  },
                  recommendations: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        name: {
                          type: Type.STRING,
                          description: "Название современной стрижки",
                        },
                        description: {
                          type: Type.STRING,
                          description: "Почему это подходит данному типу лица",
                        },
                        stylingTips: {
                          type: Type.STRING,
                          description:
                            "Советы по укладке (какие стайлинги использовать)",
                        },
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
                required: [
                  "faceShape",
                  "hairDensity",
                  "hairType",
                  "recommendations",
                ],
              },
            },
          }),
        );
        jsonStr = response.text?.trim() || "{}";
      }
      res.json(JSON.parse(jsonStr || "{}"));
      return;
    } catch (err: any) {`);

// Just keeping the catch block from original by tricking the regex, actually it's easier to construct the replacement block replacing ONLY the try content.

fs.writeFileSync('patch.js', 'done');
