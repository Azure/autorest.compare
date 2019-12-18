// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import * as path from "path";
import { compareOutputFiles } from "./comparers";
import { compareFile as compareTypeScriptFile } from "./languages/typescript";
import { printCompareMessage } from "./printer";
import { parseArgument, getAutoRestOptionsFromArgs } from "./cli";
import {
  runAutoRest,
  OutputDetails,
  AutoRestOptions,
  AutoRestLanguage,
  AutoRestLanguages
} from "./runner";

interface CompareRun {
  fullSpecPath?: string;
  oldOutput: OutputDetails;
  newOutput: OutputDetails;
}

function getRunsFromSpecPaths(
  specPaths: string[],
  specRootPath: string | undefined,
  oldOutput: OutputDetails,
  newOutput: OutputDetails
): CompareRun[] {
  const runs: CompareRun[] = [];

  for (const specPath of specPaths) {
    const fullSpecPath = path.resolve(specRootPath || ".", specPath);
    runs.push({
      fullSpecPath,
      oldOutput: {
        ...oldOutput,
        outputPath: path.join(
          oldOutput.outputPath,
          specRootPath ? specPath : ""
        )
      },
      newOutput: {
        ...newOutput,
        outputPath: path.join(
          newOutput.outputPath,
          specRootPath ? specPath : ""
        )
      }
    });
  }

  return runs;
}

async function main(): Promise<void> {
  let args = process.argv.slice(2);
  const languageArgsString = ["", ...AutoRestLanguages].join("\n  --");

  // First, check for the --help parameter, or no parameters at all
  if (args.length === 0 || args[0] === "--help") {
    console.log(
      `
Usage: autorest-compare --language [spec arguments] --output-path=[generated output path] --compare-old [run arguments] --compare-new [run arguments]

Language Arguments
${languageArgsString}

Spec Arguments

  --spec-path:[path]                           Use the specified spec path for code generation.  Relative paths will
                                               be resolved against the value of --spec-root-path if specified.
                                               NOTE: This parameter can be used multiple times to specify more than
                                               one spec path.
  --spec-root-path:[path]                      The root path from which all spec paths will be resolved.

Output Arguments

  --output-path:[generated output path]        The path where generated source files will be omitted.  This should
                                               generally be under a temporary file path.  When a --spec-root-path
                                               is provided, the path --spec-path relative to the --spec-root-path
                                               will be used as the subpath of the --output-path.

Comparison Arguments

  --compare-old[:path] [run arguments]         Indicates that what follows are arguments for the old of the comparison.

                                               You may also pass a path to an existing folder of output from a previous
                                               AutoRest run: --compare-old:path/to/existing/output.  If a --spec-root-path
                                               is provided, it is expected that the existing output will be located
                                               in a subpath equal to the relative path of a --spec-path parameter and
                                               the --spec-root-path.

                                               NOTE: When you use an existing output path, all following arguments for
                                               --compare-old will be ignored.

  --compare-new [run arguments]                Indicates that what follows are arguments for the new/new result for
                                               the comparison.

Run Arguments

  --use:<package@version>                      Use a specific AutoRest core, language, or extension package
  --debug                                      Write debug output for the AutoRest run (can be used globally or within
                                               the arguments of a specific comparison)

`.trimLeft()
    );
  } else {
    let debug = false;
    const specPaths = [];
    let outputPath: string | undefined;
    let specRootPath: string | undefined;

    // Build configuration from arguments
    let language: AutoRestLanguage | undefined;
    let oldCompareOptions: AutoRestOptions = {};
    let newCompareOptions: AutoRestOptions = {};

    let oldOutputDetails: OutputDetails | undefined;
    let newOutputDetails: OutputDetails | undefined;

    while (args.length > 0) {
      const [argName, argValue] = parseArgument(args.shift());
      if (argName === `compare-old`) {
        if (argValue && argValue !== "true") {
          oldOutputDetails = {
            outputPath: argValue,
            useExisting: true
          };
        } else {
          [oldCompareOptions, args] = getAutoRestOptionsFromArgs(args);
        }
      } else if (argName === `compare-new`) {
        if (argValue && argValue !== "true") {
          newOutputDetails = {
            outputPath: argValue,
            useExisting: true
          };
        } else {
          [newCompareOptions, args] = getAutoRestOptionsFromArgs(args);
        }
      } else if (argName === `spec-path`) {
        specPaths.push(argValue);
      } else if (argName === `spec-root-path`) {
        specRootPath = argValue;
      } else if (argName === `output-path`) {
        outputPath = argValue;
      } else if (argName === "debug") {
        debug = argValue === "true";
      } else if (AutoRestLanguages.indexOf(argName as AutoRestLanguage) > -1) {
        language = argName as AutoRestLanguage;
      }
    }

    // Override debug flags if --debug was set globally
    oldCompareOptions = {
      ...oldCompareOptions,
      debug: oldCompareOptions.debug || debug
    };
    newCompareOptions = {
      ...newCompareOptions,
      debug: newCompareOptions.debug || debug
    };

    if (language === undefined) {
      throw new Error(
        `Missing language parameter.  Please use one of the following:\n${[
          "",
          ...AutoRestLanguages
        ].join("\n    --")}\n`
      );
    }

    if (
      (!oldOutputDetails ||
        !oldOutputDetails.useExisting ||
        !newOutputDetails ||
        !newOutputDetails.useExisting) &&
      outputPath === undefined
    ) {
      throw new Error(
        "An output path must be provided with the --output-path parameter."
      );
    }

    let runs: CompareRun[] = [];
    if (
      oldOutputDetails &&
      oldOutputDetails.useExisting &&
      newOutputDetails &&
      newOutputDetails.useExisting
    ) {
      runs.push({
        oldOutput: oldOutputDetails,
        newOutput: newOutputDetails
      });
    } else if (specPaths.length === 0) {
      throw new Error(
        "A spec path must be provided with the --spec-path parameter."
      );
    } else {
      runs = getRunsFromSpecPaths(
        specPaths,
        specRootPath,
        oldOutputDetails || {
          outputPath: path.resolve(outputPath, "old"),
          useExisting: false
        },
        newOutputDetails || {
          outputPath: path.resolve(outputPath, "new"),
          useExisting: false
        }
      );
    }

    if (debug) {
      console.log("*** Runs to be executed:\n\n", runs, "\n");
    }

    console.log(`*** Comparing output of ${language} generator...`);

    for (const run of runs) {
      if (run.fullSpecPath) {
        console.log("*** Generating code for spec at path:", run.fullSpecPath);
      } else {
        console.log(`*** Comparing existing output in paths:
    ${run.oldOutput.outputPath}
    ${run.newOutput.outputPath}`);
      }

      // Run two instances of AutoRest simultaneously
      const oldRunPromise = runAutoRest(
        language,
        run.fullSpecPath || "",
        run.oldOutput,
        oldCompareOptions
      );

      const newRunPromise = runAutoRest(
        language,
        run.fullSpecPath || "",
        run.newOutput,
        newCompareOptions
      );

      const [oldResult, newResult] = await Promise.all([
        oldRunPromise,
        newRunPromise
      ]);

      if (oldCompareOptions.debug) {
        if (oldResult.processOutput) {
          console.log("\n*** Old AutoRest Output:\n");
          console.log(oldResult.processOutput);
        }
        console.log(`\n*** Output files under ${oldResult.outputPath}:
${oldResult.outputFiles.map(f => "    " + f).join("\n")}`);
      }

      if (newCompareOptions.debug) {
        if (newResult.processOutput) {
          console.log("\n*** New AutoRest Output:\n");
          console.log(newResult.processOutput);
        }

        console.log(`\n*** Output files under ${newResult.outputPath}:
${newResult.outputFiles.map(f => "    " + f).join("\n")}`);
      }

      console.log("\n*** Generation complete, comparing results...");

      const compareResult = compareOutputFiles(oldResult, newResult, {
        comparersByType: {
          ts: compareTypeScriptFile
        }
      });

      if (compareResult) {
        console.log(""); // Space out the next section by one line
        printCompareMessage(compareResult);
        console.log(""); // Space out the next section by one line
        process.exit(1);
      }

      console.log(
        "\nComparison complete, no meaningful differences detected!\n"
      );
    }
  }
}

main().catch(err => {
  console.error("\nAn error occurred during execution:\n\n", err);
  process.exit(1);
});
