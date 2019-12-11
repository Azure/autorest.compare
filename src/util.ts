// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import * as fs from "fs";
import * as path from "path";

/**
 * Returns a Set containing the items in setA that are not contained within
 * setB.
 */
export function setDifference(setA: Set<string>, setB: Set<string>): Set<string> {
  const diff = new Set(setA);
  for (let item of setB) {
    diff.delete(item);
  }

  return diff;
}

/**
 * Returns a flat list of file paths recursively under the specified folderPath.
 */
export function getPathsRecursively(folderPath: string): string[] {
  let filesInPath = [];
  for (const childPath of fs.readdirSync(folderPath)) {
    const rootedPath = path.join(folderPath, childPath);
    if (fs.statSync(rootedPath).isDirectory()) {
      filesInPath = filesInPath.concat(getPathsRecursively(rootedPath));
    } else {
      filesInPath.push(rootedPath);
    }
  }

  return filesInPath;
}
