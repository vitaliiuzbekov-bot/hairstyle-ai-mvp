import * as fs from 'fs';

let content = fs.readFileSync('server.ts', 'utf8');

// Replace the URL for HF Vision requests (modelsToTry loop)
const oldUrlRegex = /fetch\(\`https:\/\/api-inference\.huggingface\.co\/models\/\$\{m\}\/v1\/chat\/completions\`/;
content = content.replace(oldUrlRegex, 'fetch(`https://api-inference.huggingface.co/v1/chat/completions`');

// I also need to update other places that might use HF tokens but maybe not vision logic?
// No, the image generation one is:
// fetch("https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell" ... )
// which is standard inference so it doesn't need /v1/chat/completions.

fs.writeFileSync('server.ts', content);
