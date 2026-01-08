const fs = require("fs");
const content = fs.readFileSync("app/admin/upload/page.tsx", "utf8");

const lines = content.split("\n");

let roundDepth = 0;
let curlyDepth = 0;

// Start from line 355 (return statement line)
for (let i = 354; i < 420; i++) {
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

  if (roundDepth < 0 || curlyDepth < 0) {
    console.log(`NEGATIVE at line ${lineNum}: was R${prevRound} C${prevCurly}, now R${roundDepth} C${curlyDepth}`);
    console.log("  ", line.trim());
  }
}

console.log("At line 420: round =", roundDepth, "curly =", curlyDepth);
