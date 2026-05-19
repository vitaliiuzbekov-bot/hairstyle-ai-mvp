import * as fs from 'fs';

let content = fs.readFileSync('server.ts', 'utf8');

const analyzeRegex = /let jsonStr \= "";\n\s*if \(groqKey\) \{[\s\S]*?jsonStr \= data\.choices\[0\]\.message\.content\.trim\(\);\n      \} else \{/;

const newAnalyze = `let jsonStr = "";
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
      } else if (hfToken) {
        const response = await generateWithRetry(() => fetch("https://api-inference.huggingface.co/models/meta-llama/Llama-3.2-11B-Vision-Instruct/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": \`Bearer \${hfToken}\`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: "meta-llama/Llama-3.2-11B-Vision-Instruct",
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
        }));
        if (!response.ok) {
           const err = await response.json().catch(() => ({}));
           throw new Error("Hugging Face Vision Error: " + (err.error || response.statusText));
        }
        const data = await response.json();
        const content = data.choices[0].message.content.trim();
        const match = content.match(/\\{[\\s\\S]*\\}/);
        jsonStr = match ? match[0] : content;
      } else {`;

content = content.replace(analyzeRegex, newAnalyze);
fs.writeFileSync('server.ts', content);
