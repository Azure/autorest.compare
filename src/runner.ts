// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import * as path from "path";
import * as cp from "child_process";
import { getPathsRecursively } from "./util";

/**
 * Defines options that will be passed along to the AutoRest run.
 */
export interface AutoRestOptions {
  useBeta?: boolean;
  useArgs?: string[];
  version?: string;
  debug?: boolean;
}

/**
 * Describes different aspects of the result of an AutoRest run.
 */
export interface AutoRestResult {
  version: string;
  outputPath: string;
  outputFiles: string[];
  processOutput: string;
  timeElapsed: number;
}

/**
 * The names of all supported AutoRest language generators.
 */
export type AutoRestLanguage =
  | "typescript"
  | "python"
  | "java"
  | "csharp"
  | "powershell"
  | "go";

/**
 * A list of the names of all supported AutoRest language generators.
 */
export const AutoRestLanguages: AutoRestLanguage[] = [
  "typescript",
  "python",
  "java",
  "csharp",
  "powershell",
  "go"
];

/**
 * Invokes AutoRest asynchronously as a separate process, passing along the
 * specified options.  Returns a Promise that carries an AutoRestResult which
 * describes the result of the run.
 */
export async function runAutoRest(
  language: AutoRestLanguage,
  specPath: string,
  outputPath: string,
  options: AutoRestOptions
): Promise<AutoRestResult> {
  return new Promise((resolve, reject) => {
    const autoRestCommand = path.resolve(
      __dirname,
      "../node_modules/.bin/autorest-beta"
    );

    const args = [
      // The AutoRest version, if specified
      ...(options.version ? [`--version=${options.version}`] : []),

      // The language generator to use
      `--${language}`,

      // The --use flags to pass along
      ...(options.useArgs || []).map(useSpec => `--use=${useSpec}`),

      // The output-folder where generated files go
      `--${language}.output-folder=\"${outputPath}\"`,

      // Clear the output folder before generating
      `--${language}.clear-output-folder`,

      // The path to the input spec
      specPath,

      // The --debug flag, if requested
      ...(options.debug ? ["--debug"] : [])
    ];

    if (options.debug) {
      console.log(`*** Invoking ${autoRestCommand} with args:`, args);
    }

    const startTime = Date.now();

    const autoRestProcess = cp.fork(autoRestCommand, args, { stdio: "pipe" });

    let normalOutput = "";
    autoRestProcess.stdout.on("data", data => {
      normalOutput += data.toString();
    });

    let errorOutput = "";
    autoRestProcess.stderr.on("data", data => {
      errorOutput += data.toString();
    });

    autoRestProcess.on("exit", exitCode => {
      if (exitCode > 0) {
        reject(
          new Error(
            `AutoRest (${
              options.version
            }) exited with non-zero code:\n\n${errorOutput || normalOutput}`
          )
        );
      }

      const timeElapsed = Date.now() - startTime;

      resolve({
        version: options.version,
        outputPath,
        outputFiles: getPathsRecursively(outputPath).map(p =>
          path.relative(outputPath, p)
        ),
        processOutput: normalOutput,
        timeElapsed
      });
    });
  });
}
