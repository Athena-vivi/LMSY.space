const fs = require("fs");
const content = fs.readFileSync("app/admin/upload/page.tsx", "utf8");

// Remove all comments and strings to avoid false positives
let cleaned = content.replace(/\/\/.*$/gm, ""); // Single line comments
cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, ""); // Multi-line comments
cleaned = cleaned.replace(/`[^`]*`/g, ""); // Template literals
cleaned = cleaned.replace(/"[^"]*"/g, ""); // Double quotes
cleaned = cleaned.replace(/'[^']*'/g, ""); // Single quotes

const lines = cleaned.split("\n");

let roundDepth = 0;
let curlyDepth = 0;
let maxDepth = 0;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const lineNum = i + 1;

  const roundOpen = (line.match(/\(/g) || []).length;
  const roundClose = (line.match(/\)/g) || []).length;
  const curlyOpen = (line.match(/\{/g) || []).length;
  const curlyClose = (line.match(/\}/g) || []).length;

  roundDepth += roundOpen - roundClose;
  curlyDepth += curlyOpen - curlyClose;

  if (roundDepth < 0 || curlyDepth < 0) {
    console.log(`NEGATIVE at line ${lineNum}: round=${roundDepth} curly=${curlyDepth}`);
    console.log("  ", line.trim());
  }

  maxDepth = Math.max(maxDepth, Math.abs(roundDepth), Math.abs(curlyDepth));
}

console.log("\nFinal depths: round =", roundDepth, "curly =", curlyDepth);
console.log("Max absolute depth:", maxDepth);
