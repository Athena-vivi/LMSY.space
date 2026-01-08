const fs = require("fs");
const content = fs.readFileSync("app/admin/upload/page.tsx", "utf8");

// Find return line
const lines = content.split("\n");
let returnLineIndex = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("return (")) {
    returnLineIndex = i;
    break;
  }
}

console.log("Return at line:", returnLineIndex + 1);

// Check from return to end
const fromReturn = lines.slice(returnLineIndex);
let roundAfter = 0, curlyAfter = 0;
fromReturn.forEach((line, i) => {
  const roundInLine = (line.match(/\(/g) || []).length;
  const roundOutLine = (line.match(/\)/g) || []).length;
  const curlyInLine = (line.match(/\{/g) || []).length;
  const curlyOutLine = (line.match(/\}/g) || []).length;

  if (roundInLine !== roundOutLine || curlyInLine !== curlyOutLine) {
    const diff = (roundInLine - roundOutLine) + (curlyInLine - curlyOutLine);
    if (diff !== 0) {
      console.log(`Line ${returnLineIndex + i + 1}: R${roundInLine-roundOutLine} C${curlyInLine-curlyOutLine} | ${line.trim().substring(0, 60)}`);
    }
  }

  roundAfter += roundInLine - roundOutLine;
  curlyAfter += curlyInLine - curlyOutLine;
});

console.log("\nTotal from return: round =", roundAfter, "curly =", curlyAfter);
