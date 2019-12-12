import * as assert from "assert";
import * as path from "path";
import {
  parseFile,
  extractDetails,
  SourceDetails
} from "../../src/languages/typescript";

describe("TypeScript Parser", function() {
  it("extracts classes", function() {
    const parseTree = parseFile(
      path.resolve(__dirname, "../artifacts/typescript/base/index.ts")
    );
    const sourceDetails: SourceDetails = extractDetails(parseTree);

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
                  isOptional: false
                },
                {
                  name: "secondParam",
                  type: "string",
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
});
