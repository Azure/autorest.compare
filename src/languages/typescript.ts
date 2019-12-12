import * as fs from "fs";
import * as path from "path";
import * as Parser from "tree-sitter";
import * as TypeScript from "tree-sitter-typescript/typescript";
import { AutoRestResult } from "../runner";

const parser = new Parser();
parser.setLanguage(TypeScript);

export type ParameterDetails = {
  name: string;
  type: string;
  isOptional: boolean;
};

export type FieldDetails = {
  name: string;
  type: string;
  value?: string;
  isPrivate: boolean;
  isReadOnly?: boolean;
};

export type MethodDetails = {
  name: string;
  returnType: string;
  parameters: ParameterDetails[];
};

export type InterfaceDetails = {
  name: string;
  interfaces?: string[];
  methods: MethodDetails[];
  fields: FieldDetails[];
  isExported: boolean;
};

export type ClassDetails = {
  name: string;
  baseClass?: string;
  interfaces?: string[];
  methods: MethodDetails[];
  fields: FieldDetails[];
  isExported: boolean;
};

export type TypeDetails = {
  name: string;
  type: string;
  isExported: boolean;
};

export type VariableDetails = {
  name: string;
  type: string;
  value?: string;
  isExported: boolean;
};

export type SourceDetails = {
  classes: ClassDetails[];
  interfaces: InterfaceDetails[];
  types: TypeDetails[];
  variables: VariableDetails[];
};

export function parseFile(filePath: string): Parser.Tree {
  const contents = fs.readFileSync(filePath).toString();
  return parser.parse(contents);
}

function extractField(fieldNode: Parser.SyntaxNode): FieldDetails {
  const { typeNode, valueNode } = fieldNode as any;
  const accessibilityNode = fieldNode.namedChildren.find(
    n => n.type === "accessibility_modifier"
  );
  const readOnlyNode = fieldNode.namedChildren.find(n => n.type === "readonly");

  return {
    name: (fieldNode as any).nameNode.text,
    type: typeNode ? typeNode.children[1].text : "any",
    value: valueNode ? valueNode.text : undefined,
    isPrivate: accessibilityNode && accessibilityNode.text !== "public",
    isReadOnly: readOnlyNode !== undefined
  };
}

function extractParameter(parameterNode: Parser.SyntaxNode): ParameterDetails {
  const [nameNode, typeNode] = parameterNode.namedChildren;

  return {
    name: nameNode.text,
    isOptional: parameterNode.type === "optional_parameter",
    type: typeNode ? typeNode.children[1].text : "any"
  };
}

function extractMethod(methodNode: Parser.SyntaxNode): MethodDetails {
  const returnTypeNode = (methodNode as any).returnTypeNode;
  const parameterNodes = (methodNode as any).parametersNode.namedChildren;

  return {
    name: (methodNode as any).nameNode.text,
    returnType: returnTypeNode ? returnTypeNode.children[1].text : "any",
    parameters: parameterNodes.map(extractParameter)
  };
}

function isExported(node: Parser.SyntaxNode): boolean {
  return node.parent.type === "export_statement";
}

function extractClass(classNode: Parser.SyntaxNode): ClassDetails {
  const classBody: Parser.SyntaxNode = (classNode as any).bodyNode;
  return {
    name: (classNode as any).nameNode.text,
    methods: classBody.namedChildren
      .filter(n => n.type === "method_definition")
      .map(extractMethod),
    fields: classBody.namedChildren
      .filter(n => n.type === "public_field_definition")
      .map(extractField),
    isExported: isExported(classNode)
  };
}

function extractTypeAlias(typeAliasNode: Parser.SyntaxNode): TypeDetails {
  const typeNode = (typeAliasNode as any).valueNode;

  return {
    name: (typeAliasNode as any).nameNode.text,
    type: typeNode.text,
    isExported: isExported(typeAliasNode)
  };
}

function extractVariable(variableNode: Parser.SyntaxNode): VariableDetails {
  const typeNode = (variableNode as any).typeNode;
  const valueNode = (variableNode as any).valueNode;

  return {
    name: (variableNode as any).nameNode.text,
    type: typeNode ? typeNode.children[1].text : "any",
    value: valueNode ? valueNode.text : undefined,
    // variable_declarator is wrapped in a lexical_declaration
    isExported: isExported(variableNode.parent)
  };
}

export function isModuleScopeVariable(
  variableNode: Parser.SyntaxNode
): boolean {
  const grandparent = variableNode.parent && variableNode.parent.parent;
  return (
    grandparent &&
    (grandparent.type === "export_statement" || grandparent.type === "program")
  );
}

export function extractDetails(parseTree: Parser.Tree): SourceDetails {
  console.error(parseTree.rootNode.toString());
  return {
    classes: parseTree.rootNode
      .descendantsOfType("class_declaration")
      .map(extractClass),
    interfaces: [],
    types: parseTree.rootNode
      .descendantsOfType("type_alias_declaration")
      .map(extractTypeAlias),
    variables: parseTree.rootNode
      .descendantsOfType("variable_declarator")
      .filter(isModuleScopeVariable)
      .map(extractVariable)
  };
}

export function buildSourceDetails(
  sourceFiles: string[],
  baseSourcePath: string
): SourceDetails {
  for (const file of sourceFiles) {
    const parseTree = parseFile(path.resolve(baseSourcePath, file));
    extractDetails(parseTree);
  }

  return {
    classes: [],
    interfaces: [],
    types: [],
    variables: []
  };
}

export async function compareTypeScriptSource(
  baseResult: AutoRestResult,
  nextResult: AutoRestResult
): Promise<void> {
  const baseSourceDetails = buildSourceDetails(
    baseResult.outputFiles,
    baseResult.outputPath
  );
  const nextSourceDetails = buildSourceDetails(
    nextResult.outputFiles,
    nextResult.outputPath
  );
}
