const fs = require("fs");
const content = fs.readFileSync("app/admin/upload/page.tsx", "utf8");

const lines = content.split("\n");

// Track bracket depth
let roundDepth = 0;
let curlyDepth = 0;
let inReturn = false;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];

  if (line.includes("return (")) {
    inReturn = true;
    roundDepth = 1; // The opening paren from return
  }

  if (inReturn) {
    for (let char of line) {
      if (char === '(') roundDepth++;
      if (char === ')') {
        roundDepth--;
        if (roundDepth === 0) {
          console.log("Return statement closes at line", i + 1);
          console.log("Remaining lines:", lines.length - i - 1);

          // Check remaining brackets
          let remainingRound = 0, remainingCurly = 0;
          for (let j = i + 1; j < lines.length; j++) {
            remainingRound += (lines[j].match(/\(/g) || []).length;
            remainingRound -= (lines[j].match(/\)/g) || []).length;
            remainingCurly += (lines[j].match(/\{/g) || []).length;
            remainingCurly -= (lines[j].match(/\}/g) || []).length;
          }

          console.log("Remaining brackets: round =", remainingRound, "curly =", remainingCurly);
          process.exit(0);
        }
      }
      if (char === '{') curlyDepth++;
      if (char === '}') curlyDepth--;
    }
  }
}

console.log("Never found return statement closing");
