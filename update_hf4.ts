import * as fs from 'fs';

let content = fs.readFileSync('server.ts', 'utf8');

const loadMoreRegex = /app\.post\("\/api\/load-more", async \(req, res\) => \{[\s\S]*?res\.status\(500\)\.json\(\{ error: errorMsg \}\);\n    \}\n  \}\);/m;

const newLoadMore = `app.post("/api/load-more", async (req, res) => {
    try {
      const apiKey = getApiKeyFromRequest(req);
      const groqKey = req.headers["x-groq-key"] as string;
      const hfToken = req.headers["x-hf-token"] as string;
      
      const { imageBase64, imageUrl, mimeType, existingNames } = req.body;
      const targetBase64 = await fetchImageAsBase64(imageUrl, imageBase64);

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
      } else if (hfToken) {
        let lastHfErr;
        let finalContent = "";
        const modelsToTry = [
          "Qwen/Qwen2.5-VL-72B-Instruct",
          "Qwen/Qwen2.5-VL-7B-Instruct",
          "mistralai/Pixtral-12B-2409",
          "meta-llama/Llama-3.2-11B-Vision-Instruct"
        ];
        
        for (const m of modelsToTry) {
           try {
             const response = await fetch(\`https://api-inference.huggingface.co/v1/chat/completions\`, {
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
             
             if (!response.ok) continue;
             const data = await response.json();
             finalContent = data.choices[0].message.content.trim();
             break;
           } catch(e) {
             lastHfErr = e;
           }
        }
        
        if (!finalContent) throw lastHfErr || new Error("HF failed to load more");
        const match = finalContent.match(/\\{[\\s\\S]*\\}/);
        jsonStr = match ? match[0] : finalContent;
      } else {
        if (!apiKey) {
          return res.status(401).json({ error: "API-ключ не настроен. Пожалуйста, введите свой API-ключ в настройках (⚙️)." });
        }
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
      }
      res.json(JSON.parse(jsonStr || "{}"));
    } catch (err: any) {
      console.error(err);
      let errorMsg = err.message || "Ошибка генерации новых вариантов";
      if (typeof errorMsg === "string" && errorMsg.trim().startsWith("{")) {
        try {
          const parsed = JSON.parse(errorMsg);
          errorMsg = parsed.error?.message || errorMsg;
        } catch(e) {}
      }
      if (typeof errorMsg === "object") errorMsg = JSON.stringify(errorMsg);
      if (
        typeof errorMsg === "string" &&
        (errorMsg.includes("API key not valid") || errorMsg.includes("API_KEY_INVALID"))
      ) {
        errorMsg = "Неверный API-ключ Gemini. Проверьте настройки (⚙️).";
      } else if (
        typeof errorMsg === "string" && 
        errorMsg.includes("API key expired")
      ) {
        errorMsg = "Срок действия встроенного API-ключа истек. Пожалуйста, обновите рабочий ключ в настройках (⚙️) или в переменных окружения хостинга (Render).";
      } else if (
        typeof errorMsg === "string" &&
        errorMsg.includes("leaked")
      ) {
        errorMsg = "Ваш API-ключ заблокирован Google (так как попал в открытый доступ). Пожалуйста, удалите его и создайте новый в Google AI Studio.";
      } else if (
        typeof errorMsg === "string" &&
        (errorMsg.includes("429") ||
          errorMsg.includes("quota") ||
          errorMsg.includes("RESOURCE_EXHAUSTED"))
      ) {
        errorMsg =
          "Квота исчерпана (429) или ключ только создан. Введите свой API-ключ в настройках (⚙️).";
      } else if (
        typeof errorMsg === "string" &&
        (errorMsg.includes("503") ||
          errorMsg.includes("high demand") ||
          errorMsg.includes("UNAVAILABLE") ||
          errorMsg.includes("overloaded"))
      ) {
        errorMsg = "Сервер перегружен (503). Повторите попытку.";
      }
      res.status(500).json({ error: errorMsg });
    }
  });`;

content = content.replace(loadMoreRegex, newLoadMore);
fs.writeFileSync('server.ts', content);
