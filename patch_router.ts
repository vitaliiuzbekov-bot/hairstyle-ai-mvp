import * as fs from 'fs';

let content = fs.readFileSync('server.ts', 'utf8');

const regex1 = /fetch\(\`https:\/\/api-inference\.huggingface\.co\/v1\/chat\/completions\`/g;
content = content.replace(regex1, 'fetch(`https://router.huggingface.co/hf-inference/v1/chat/completions`');

fs.writeFileSync('server.ts', content);
