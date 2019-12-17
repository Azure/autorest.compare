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
              visibility: "public",
              genericTypes: [],
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
              visibility: "public",
              genericTypes: [],
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
              visibility: "public",
              genericTypes: [],
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
              visibility: "public",
              genericTypes: [],
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
            },
            {
              name: "hasGenericParam",
              visibility: "protected",
              returnType: "void",
              genericTypes: [
                {
                  name: "T",
                  ordinal: 0
                }
              ],
              parameters: [
                {
                  name: "genericParam",
                  isOptional: false,
                  ordinal: 0,
                  type: "T"
                }
              ]
            }
          ],
          fields: [
            {
              name: "removedField",
              type: "string",
              value: undefined,
              isReadOnly: false,
              visibility: "private"
            },
            {
              name: "visibilityChangedField",
              type: "Namespace.Type",
              value: undefined,
              isReadOnly: false,
              visibility: "public"
            },
            {
              name: "readOnlyChangedField",
              type: "any",
              value: `"stuff"`,
              isReadOnly: true,
              visibility: "private"
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
      interfaces: [
        {
          name: "SomeInterface",
          methods: [],
          fields: [],
          isExported: false
        },
        {
          name: "BaseInterface",
          methods: [],
          fields: [],
          isExported: false
        },
        {
          name: "AnotherInterface",
          methods: [],
          fields: [],
          isExported: true
        }
      ],
      types: [
        {
          name: "SomeUnion",
          type: `"red" | "green" | "brurple"`,
          isExported: true
        }
      ],
      functions: [
        {
          genericTypes: [
            {
              name: "T",
              ordinal: 0
            }
          ],
          name: "someFunction",
          parameters: [
            {
              name: "genericParam",
              type: "T",
              ordinal: 0,
              isOptional: false
            }
          ],
          returnType: "string"
        }
      ],
      variables: [
        {
          name: "SomeConst",
          type: "SomeUnion",
          value: `"red"`,
          isExported: true,
          isConst: true
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
        genericTypes: [],
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
        genericTypes: [],
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
