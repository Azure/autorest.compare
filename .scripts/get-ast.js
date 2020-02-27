const fs = require("fs");
const Parser = require("tree-sitter");

// USAGE:
// node .scripts/get-ast.js --python file-to-parse.py

// Set up the parser
const parser = new Parser();
switch (process.argv[2]) {
  case "--typescript":
    const TypeScript = require("tree-sitter-typescript/typescript");
    parser.setLanguage(TypeScript);
    break;
  case "--python":
    const Python = require("tree-sitter-python");
    parser.setLanguage(Python);
    break;
  default:
    console.error(
      "A language argument is needed to choose a Tree Sitter parser."
    );
    process.exit(1);
}

function prettyPrint(rootNode) {
  let indentLevel = -1;
  const printed = rootNode.toString();
  for (let i = 0; i < printed.length; i++) {
    if (printed[i] === "(") {
      indentLevel++;
      process.stdout.write("\n" + "  ".repeat(indentLevel));
    } else if (printed[i] === ")") {
      indentLevel--;
      // process.stdout.write("\n");
    }

    process.stdout.write(printed[i]);
  }
}

const fileToParse = process.argv[3];
if (fileToParse) {
  const contents = fs.readFileSync(fileToParse).toString();
  const parsedContents = parser.parse(contents);
  prettyPrint(parsedContents.rootNode);
  console.log();
} else {
  console.error(
    "A path to a source file must be provided as the second argument."
  );
  process.exit(1);
}
