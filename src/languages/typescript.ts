import * as fs from "fs";
import * as path from "path";
import * as Parser from "tree-sitter";
import * as TypeScript from "tree-sitter-typescript/typescript";
import {
  CompareResult,
  FileDetails,
  prepareResult,
  compareItems,
  compareValue,
  MessageType
} from "../comparers";

const parser = new Parser();
parser.setLanguage(TypeScript);

export type ParameterDetails = {
  name: string;
  type: string;
  ordinal: number;
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

function extractParameter(
  parameterNode: Parser.SyntaxNode,
  ordinal: number
): ParameterDetails {
  const [nameNode, typeNode] = parameterNode.namedChildren;

  return {
    name: nameNode.text,
    type: typeNode ? typeNode.children[1].text : "any",
    ordinal,
    isOptional: parameterNode.type === "optional_parameter"
  };
}

function extractMethod(methodNode: Parser.SyntaxNode): MethodDetails {
  const returnTypeNode = (methodNode as any).returnTypeNode;
  const parameterNodes = (methodNode as any).parametersNode.namedChildren;

  return {
    name: (methodNode as any).nameNode.text,
    returnType: returnTypeNode ? returnTypeNode.children[1].text : "any",
    parameters: parameterNodes.map((p, i) => extractParameter(p, i))
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

export function extractSourceDetails(parseTree: Parser.Tree): SourceDetails {
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

export function compareParameter(
  oldParameter: ParameterDetails,
  newParameter: ParameterDetails
): CompareResult {
  newParameter.isOptional;
  return prepareResult(oldParameter.name, MessageType.Changed, [
    compareValue("Type", oldParameter.type, newParameter.type),
    compareValue("Optional", oldParameter.isOptional, newParameter.isOptional)
  ]);
}

export function compareMethod(
  oldMethod: MethodDetails,
  newMethod: MethodDetails
): CompareResult {
  return prepareResult(oldMethod.name, MessageType.Changed, [
    compareItems(
      "Parameters",
      MessageType.Outline,
      oldMethod.parameters,
      newMethod.parameters,
      compareParameter,
      true
    ),
    compareValue("Return Type", oldMethod.returnType, newMethod.returnType)
  ]);
}

export function compareClass(
  oldClass: ClassDetails,
  newClass: ClassDetails
): CompareResult {
  return prepareResult(oldClass.name, MessageType.Changed, [
    compareItems(
      "Methods",
      MessageType.Outline,
      oldClass.methods,
      newClass.methods,
      compareMethod
    )
  ]);
}

export function compareFile(
  oldFile: FileDetails,
  newFile: FileDetails
): CompareResult {
  const oldSource = extractSourceDetails(
    parseFile(path.resolve(oldFile.basePath, oldFile.name))
  );
  const newSource = extractSourceDetails(
    parseFile(path.resolve(newFile.basePath, newFile.name))
  );

  return prepareResult(oldFile.name, MessageType.Changed, [
    compareItems(
      "Classes",
      MessageType.Outline,
      oldSource.classes,
      newSource.classes,
      compareClass
    )
  ]);
}
