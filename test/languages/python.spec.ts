import * as assert from "assert";
import * as path from "path";
import {
  parseFile,
  extractSourceDetails,
  SourceDetails
  // compareClass,
  // compareInterface,
  // compareParameter,
  // compareMethod
} from "../../src/languages/python";
import { MessageType } from "../../src/comparers";

describe.only("Python Parser", function() {
  it("extracts semantic elements from source", function() {
    const parseTree = parseFile(
      path.resolve(__dirname, "../artifacts/python/old/test.py")
    );
    const sourceDetails: SourceDetails = extractSourceDetails(parseTree);

    assert.deepEqual(sourceDetails, {
      classes: [
        {
          name: "Operations",
          methods: [],
          assignments: []
        },
        {
          name: "RedisFirewallRule",
          methods: [],
          assignments: []
        }
      ]
    });
  });
});
