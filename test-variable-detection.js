/**
 * Test to verify undeclared variable detection works
 * Simulates the exact scenario: setDark used but not declared
 */

const testCode = `
function Navbar() {
  return (
    <nav>
      <h3>Demo Navbar</h3>
      <button onClick={() => setDark(!dark)}>Toggle Theme</button>
    </nav>
  );
}
`;

// Simulate the detection logic
function detectUndeclaredVariables(code) {
  const declaredVars = new Set();
  const undeclaredVars = [];
  const lines = code.split('\n');
  
  // Extract array destructuring (React hooks)
  const arrayDestructuring = code.matchAll(/(?:const|let|var)\s*\[([^\]]+)\]\s*=/g);
  for (const match of arrayDestructuring) {
    const vars = match[1].split(',').map(v => v.trim().split(/[:=]/)[0].trim());
    vars.forEach(v => {
      if (v && !v.includes('...')) {
        declaredVars.add(v);
        console.log(`✅ Declared (array destructuring): ${v}`);
      }
    });
  }
  
  // Extract regular variable declarations
  const varDeclarations = code.matchAll(/(?:const|let|var)\s+(\w+)/g);
  for (const match of varDeclarations) {
    declaredVars.add(match[1]);
    console.log(`✅ Declared (var/let/const): ${match[1]}`);
  }
  
  // Scan for variable usage
  lines.forEach((line, index) => {
    if (!line.trim() || line.trim().startsWith('//')) return;
    
    const varRefs = line.matchAll(/\b([a-zA-Z_$][a-zA-Z0-9_$]*)\b/g);
    for (const match of varRefs) {
      const varName = match[1];
      const matchIndex = match.index;
      
      // Skip keywords
      const keywords = ['if', 'else', 'return', 'true', 'false', 'null', 'undefined', 'this', 'React', 'useState', 'useEffect', 'function', 'const', 'let', 'var'];
      if (keywords.includes(varName)) continue;
      
      // Skip property access
      const charBefore = matchIndex > 0 ? line[matchIndex - 1] : '';
      if (charBefore === '.') continue;
      
      // Check if undeclared
      if (!declaredVars.has(varName)) {
        const beforeMatch = line.substring(0, matchIndex);
        const afterMatch = line.substring(matchIndex + varName.length);
        
        // Check if in JSX attribute or arrow function
        const isInJSXAttribute = /on\w+\s*=\s*\{/.test(beforeMatch) || /=\s*\{/.test(beforeMatch);
        const isInArrowFunction = /=>\s*/.test(beforeMatch);
        const isReactSetter = /^set[A-Z]/.test(varName);
        const isMethodCall = afterMatch.match(/^\s*\(/);
        
        if (isInJSXAttribute || (isInArrowFunction && !isMethodCall) || isReactSetter) {
          console.log(`❌ UNDECLARED: ${varName} at line ${index + 1}`);
          console.log(`   Context: ${line.trim()}`);
          console.log(`   - In JSX attribute: ${isInJSXAttribute}`);
          console.log(`   - In arrow function: ${isInArrowFunction}`);
          console.log(`   - Is React setter: ${isReactSetter}`);
          undeclaredVars.push({ name: varName, line: index + 1, context: line.trim() });
        }
      }
    }
  });
  
  return undeclaredVars;
}

console.log("🧪 Testing Variable Detection");
console.log("=".repeat(60));
console.log("\n📝 Test Code:");
console.log(testCode);
console.log("\n🔍 Detection Results:");
const undeclared = detectUndeclaredVariables(testCode);
console.log(`\n✅ Found ${undeclared.length} undeclared variable(s):`);
undeclared.forEach(v => {
  console.log(`   - ${v.name} (line ${v.line}): ${v.context}`);
});

if (undeclared.length === 0) {
  console.log("\n❌ ERROR: Should have detected 'setDark' and 'dark' as undeclared!");
} else {
  const hasSetDark = undeclared.some(v => v.name === 'setDark');
  const hasDark = undeclared.some(v => v.name === 'dark');
  if (hasSetDark && hasDark) {
    console.log("\n✅ SUCCESS: Both 'setDark' and 'dark' detected!");
  } else {
    console.log(`\n⚠️  Partial detection: setDark=${hasSetDark}, dark=${hasDark}`);
  }
}

