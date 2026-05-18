import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf-8');

// Container
content = content.replace(/bg-\[#f7f4ed\]\/80/g, 'glass-header');
content = content.replace(/bg-\[#f7f4ed\]/g, 'bg-transparent text-white/90');

// Typography
content = content.replace(/text-\[#1c1c1c\]/g, 'text-white/90');
content = content.replace(/text-\[#5f5f5d\]/g, 'text-white/60');
content = content.replace(/text-\[#fcfbf8\]/g, 'text-white/90');
content = content.replace(/text-\[#a0a09e\]/g, 'text-white/40');

// Borders
content = content.replace(/border-\[#eceae4\]/g, 'border-white/10');
content = content.replace(/border-\[#1c1c1c\]\/40/g, 'border-white/20');
content = content.replace(/border-\[#1c1c1c\]\/20/g, 'border-white/10');

// Surfaces & Backgrounds
content = content.replace(/bg-\[#fcfbf8\]\/80/g, 'bg-white/5 backdrop-blur-md');
content = content.replace(/bg-\[#fcfbf8\]/g, 'glass-panel');
content = content.replace(/bg-\[#1c1c1c\]\/80/g, 'bg-black/60');
content = content.replace(/bg-\[#1c1c1c\]\/90/g, 'bg-white/10');
content = content.replace(/bg-\[#1c1c1c\]\/[0-9.]+/g, 'bg-white/10');
content = content.replace(/bg-\[#eceae4\]\/[0-9.]+/g, 'bg-white/5');
content = content.replace(/bg-\[#eceae4\]/g, 'bg-white/10');
content = content.replace(/bg-\[#1c1c1c\]/g, 'glass-button');

// Shadows
content = content.replace(/shadow-\[inset_0px_0\.5px_0px_0px_rgba\(255,255,255,0\.2\),inset_0px_0px_0px_0\.5px_rgba\(0,0,0,0\.2\),0px_1px_2px_0px_rgba\(0,0,0,0\.05\)\]/g, 'shadow-[0_8px_32px_rgba(0,0,0,0.37)]');

fs.writeFileSync('src/App.tsx', content);
console.log("App.tsx transformed for glassmorphism");
