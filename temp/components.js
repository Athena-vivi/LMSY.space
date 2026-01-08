const fs = require("fs");
const content = fs.readFileSync("app/admin/upload/page.tsx", "utf8");

// Find return statement
const returnMatch = content.match(/return \(([\s\S]+)\n\s*\);/);
if (!returnMatch) {
  console.log("Could not find return statement pattern");
  process.exit(1);
}

const jsx = returnMatch[1];

// Find all component tags
const componentOpen = jsx.match(/<([A-Z][a-zA-Z]*)[^>]*>/g) || [];
const componentClose = jsx.match(/<\/([A-Z][a-zA-Z]*)>/g) || [];

console.log("Opening components:");
componentOpen.forEach(tag => console.log("  ", tag));

console.log("\nClosing components:");
componentClose.forEach(tag => console.log("  ", tag));

// Count by component name
const opens = {};
const closes = {};

componentOpen.forEach(tag => {
  const match = tag.match(/<([A-Z][a-zA-Z]*)/);
  if (match) {
    const name = match[1];
    opens[name] = (opens[name] || 0) + 1;
  }
});

componentClose.forEach(tag => {
  const match = tag.match(/<\/([A-Z][a-zA-Z]*)/);
  if (match) {
    const name = match[1];
    closes[name] = (closes[name] || 0) + 1;
  }
});

console.log("\nComponent counts:");
Object.keys(opens).forEach(name => {
  console.log(`  ${name}: ${opens[name]} opens, ${closes[name] || 0} closes, diff: ${opens[name] - (closes[name] || 0)}`);
});

Object.keys(closes).forEach(name => {
  if (!opens[name]) {
    console.log(`  ${name}: 0 opens, ${closes[name]} closes (unmatched close!)`);
  }
});
