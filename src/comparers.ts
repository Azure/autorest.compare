// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { setDifference } from "./util";
import { AutoRestResult } from "./runner";

export type Comparer = (baseResult: AutoRestResult, nextResult: AutoRestResult) => Promise<void>;

/**
 * Compares the outputFiles of two AutoRestResults to see if there are any
 * unique files contained in either output.
 */
export async function compareFileSets(
  baseResult: AutoRestResult,
  nextResult: AutoRestResult
): Promise<void> {
  const baseFileSet = new Set(baseResult.outputFiles);
  const nextFileSet = new Set(nextResult.outputFiles);
  const ignoredFiles = new Set(["code-model-v1"]);

  const baseUniqueFiles = setDifference(
    setDifference(baseFileSet, nextFileSet),
    ignoredFiles
  );

  const nextUniqueFiles = setDifference(
    setDifference(nextFileSet, baseFileSet),
    ignoredFiles
  );

  if (baseUniqueFiles.size > 0 || nextUniqueFiles.size > 0) {
    throw new Error(`Generated output has different file sets.

Base Output Unique Files:

${Array.from(baseUniqueFiles).join("\n")}
Next Output Unique Files:

${Array.from(nextUniqueFiles).join("\n")}
`);
  }
}

/**
 * Compares the timeElapsed of two AutoRestResults to see if the AutoRest
 * runtime has improved or degraded between the two runs.
 */
export async function compareDuration(
  baseResult: AutoRestResult,
  nextResult: AutoRestResult
): Promise<void> {
  // TODO: Write some logic for this
}

/**
 * Returns the default set of comparers.
 */
export function getDefaultComparers(): Comparer[] {
  return [
    compareFileSets,
    compareDuration
  ];
}
