import * as fs from 'fs';
let content = fs.readFileSync('server.ts', 'utf8');
content = content.replace(/"mistralai\/Pixtral-12B-2409",/g, '"mistralai/Pixtral-12B-2409",\n          "Qwen/Qwen2-VL-7B-Instruct",');
fs.writeFileSync('server.ts', content);
