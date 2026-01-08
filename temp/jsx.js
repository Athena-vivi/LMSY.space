const fs = require("fs");
const content = fs.readFileSync("app/admin/upload/page.tsx", "utf8");

// Find return statement
const returnMatch = content.match(/return \(([\s\S]+)\n\s*\);/);
if (!returnMatch) {
  console.log("Could not find return statement pattern");
  process.exit(1);
}

const jsx = returnMatch[1];

// Count JSX opening and closing tags
const opens = (jsx.match(/<[A-Z][a-zA-Z]*/g) || []).length;
const closes = (jsx.match(/<\/[A-Z][a-zA-Z]*/g) || []).length;
const selfCloses = (jsx.match(/\/>/g) || []).length;

console.log("JSX component opens:", opens);
console.log("JSX component closes:", closes);
console.log("Self-closing tags:", selfCloses);

// Count div tags
const divOpens = (jsx.match(/<div/g) || []).length;
const divCloses = (jsx.match(/<\/div>/g) || []).length;
console.log("\nDiv opens:", divOpens);
console.log("Div closes:", divCloses);
console.log("Difference:", divOpens - divCloses);
