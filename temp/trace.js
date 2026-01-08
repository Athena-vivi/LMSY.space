const fs = require("fs");
const content = fs.readFileSync("app/admin/upload/page.tsx", "utf8");

const lines = content.split("\n");

let roundDepth = 0;
let curlyDepth = 0;

for (let i = 0; i < 420; i++) {
  const line = lines[i];
  const lineNum = i + 1;

  const roundOpen = (line.match(/\(/g) || []).length;
  const roundClose = (line.match(/\)/g) || []).length;
  const curlyOpen = (line.match(/\{/g) || []).length;
  const curlyClose = (line.match(/\}/g) || []).length;

  roundDepth += roundOpen - roundClose;
  curlyDepth += curlyOpen - curlyClose;

  if (lineNum > 415 && (roundOpen !== 0 || roundClose !== 0 || curlyOpen !== 0 || curlyClose !== 0)) {
    console.log(`Line ${lineNum}: R${roundOpen - roundClose} C${curlyOpen - curlyClose} | total: R${roundDepth} C${curlyDepth}`);
  }
}

console.log("\nAt line 420: round =", roundDepth, "curly =", curlyDepth);
