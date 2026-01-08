const fs = require("fs");
const content = fs.readFileSync("app/admin/upload/page.tsx", "utf8");

const lines = content.split("\n");

let roundDepth = 0;
let curlyDepth = 0;
let functionDepth = 0;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const lineNum = i + 1;

  const roundOpen = (line.match(/\(/g) || []).length;
  const roundClose = (line.match(/\)/g) || []).length;
  const curlyOpen = (line.match(/\{/g) || []).length;
  const curlyClose = (line.match(/\}/g) || []).length;

  const prevRound = roundDepth;
  const prevCurly = curlyDepth;

  roundDepth += roundOpen - roundClose;
  curlyDepth += curlyOpen - curlyClose;

  // Track function depth (ignoring functions inside return statement)
  if (line.includes("function") || line.match(/\w+\s*\(/)) {
    // This is a crude detection
  }

  if (curlyDepth < 0) {
    console.log(`NEGATIVE curly at line ${lineNum}: was ${prevCurly}, now ${curlyDepth}`);
    console.log("  ", line.trim());
  }
}

console.log("\nFinal depths: round =", roundDepth, "curly =", curlyDepth);
