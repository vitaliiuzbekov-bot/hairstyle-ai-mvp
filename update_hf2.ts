import * as fs from 'fs';

let content = fs.readFileSync('server.ts', 'utf8');

const regex = /const response = await generateWithRetry\(\(\) => fetch\("https:\/\/api-inference\.huggingface\.co\/models\/(Qwen\/Qwen2\.5-VL-72B-Instruct|meta-llama\/Llama-3\.2-11B-Vision-Instruct)\/v1\/chat\/completions"[\s\S]*?jsonStr = match \? match\[0\] : content;/g;

const replacement = `
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
             const response = await fetch(\`https://api-inference.huggingface.co/models/\${m}/v1/chat/completions\`, {
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
           } catch (e) {
             console.error("HF Model failed:", e);
             lastHfErr = e;
           }
        }
        
        if (!finalContent) {
           throw lastHfErr || new Error("Failed to get response from all Hugging Face Vision models");
        }
        
        const match = finalContent.match(/\\{[\\s\\S]*\\}/);
        jsonStr = match ? match[0] : finalContent;`;

content = content.replace(regex, replacement);

fs.writeFileSync('server.ts', content);
