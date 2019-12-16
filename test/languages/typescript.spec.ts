import * as assert from "assert";
import * as path from "path";
import {
  parseFile,
  extractSourceDetails,
  SourceDetails,
  compareParameter,
  compareMethod
} from "../../src/languages/typescript";
import { MessageType } from "../../src/comparers";

describe("TypeScript Parser", function() {
  it("extracts classes", function() {
    const parseTree = parseFile(
      path.resolve(__dirname, "../artifacts/typescript/base/index.ts")
    );
    const sourceDetails: SourceDetails = extractSourceDetails(parseTree);

    assert.deepEqual(sourceDetails, {
      classes: [
        {
          name: "SomeClass",
          isExported: false,
          methods: [
            {
              name: "removedMethod",
              returnType: "void",
              parameters: [
                {
                  name: "optional",
                  type: "string",
                  ordinal: 0,
                  isOptional: true
                }
              ]
            },
            {
              name: "changedParamType",
              returnType: "void",
              parameters: [
                {
                  name: "firstParam",
                  type: "string",
                  ordinal: 0,
                  isOptional: false
                }
              ]
            },
            {
              name: "changedReturnType",
              returnType: "string",
              parameters: [
                {
                  name: "firstParam",
                  type: "string",
                  ordinal: 0,
                  isOptional: false
                }
              ]
            },
            {
              name: "reorderedParams",
              returnType: "void",
              parameters: [
                {
                  name: "firstParam",
                  type: "string",
                  ordinal: 0,
                  isOptional: false
                },
                {
                  name: "secondParam",
                  type: "string",
                  ordinal: 1,
                  isOptional: false
                }
              ]
            }
          ],
          fields: [
            {
              name: "removedField",
              type: "string",
              value: undefined,
              isPrivate: true,
              isReadOnly: false
            },
            {
              name: "visibilityChangedField",
              type: "Namespace.Type",
              value: undefined,
              isPrivate: false,
              isReadOnly: false
            },
            {
              name: "readOnlyChangedField",
              type: "any",
              value: `"stuff"`,
              isPrivate: true,
              isReadOnly: true
            }
          ]
        },
        {
          name: "BaseClass",
          methods: [],
          fields: [],
          isExported: false
        },
        {
          name: "ExportedClass",
          methods: [],
          fields: [],
          isExported: true
        }
      ],
      interfaces: [],
      types: [
        {
          name: "SomeUnion",
          type: `"red" | "green" | "brurple"`,
          isExported: true
        }
      ],
      variables: [
        {
          name: "SomeConst",
          type: "SomeUnion",
          value: `"red"`,
          isExported: true
        }
      ]
    } as SourceDetails);
  });

  it("compares parameters", () => {
    const result = compareParameter(
      {
        name: "firstParam",
        type: "string",
        ordinal: 0,
        isOptional: false
      },
      {
        name: "firstParam",
        type: "number",
        ordinal: 0,
        isOptional: true
      }
    );

    assert.deepEqual(result, {
      message: "firstParam",
      type: MessageType.Changed,
      children: [
        {
          message: "Type",
          type: MessageType.Outline,
          children: [
            { message: "string", type: MessageType.Removed },
            { message: "number", type: MessageType.Added }
          ]
        },
        {
          message: "Optional",
          type: MessageType.Outline,
          children: [
            { message: "false", type: MessageType.Removed },
            { message: "true", type: MessageType.Added }
          ]
        }
      ]
    });
  });

  it("compares methods", () => {
    const result = compareMethod(
      {
        name: "theFunc",
        returnType: "string",
        parameters: [
          {
            name: "firstParam",
            type: "string",
            ordinal: 0,
            isOptional: false
          }
        ]
      },
      {
        name: "theFunc",
        returnType: "any",
        parameters: [
          {
            name: "differentParam",
            type: "number",
            ordinal: 0,
            isOptional: true
          }
        ]
      }
    );

    assert.deepEqual(result, {
      message: "theFunc",
      type: MessageType.Changed,
      children: [
        {
          message: "Parameters",
          type: MessageType.Outline,
          children: [
            { message: "firstParam", type: MessageType.Removed },
            { message: "differentParam", type: MessageType.Added }
          ]
        },
        {
          message: "Return Type",
          type: MessageType.Outline,
          children: [
            { message: "string", type: MessageType.Removed },
            { message: "any", type: MessageType.Added }
          ]
        }
      ]
    });
  });
});
