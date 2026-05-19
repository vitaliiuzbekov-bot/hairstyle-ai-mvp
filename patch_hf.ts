import * as fs from 'fs';

let content = fs.readFileSync('server.ts', 'utf8');

const regex = /"meta-llama\/Llama-3\.2-11B-Vision-Instruct"/g;
content = content.replace(regex, '"Qwen/Qwen2.5-VL-72B-Instruct"');

fs.writeFileSync('server.ts', content);
