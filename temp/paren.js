const fs = require("fs");
const content = fs.readFileSync("app/admin/upload/page.tsx", "utf8");

const lines = content.split("\n");

// Find return statement
let returnStart = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("return (")) {
    returnStart = i;
    break;
  }
}

let depth = 1; // Opening paren from return (

for (let i = returnStart + 1; i < lines.length; i++) {
  const line = lines[i];
  const lineNum = i + 1;

  for (let char of line) {
    if (char === '(') depth++;
    if (char === ')') {
      depth--;
      if (depth === 0) {
        console.log("Return closes at line", lineNum);
        console.log("Remaining content:");
        console.log(lines.slice(i).join("\n").substring(0, 200));
        process.exit(0);
      }
    }
  }
}

console.log("Never found closing paren for return");
