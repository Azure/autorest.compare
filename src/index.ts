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
  baseOutput: OutputDetails;
  nextOutput: OutputDetails;
}

function getRunsFromSpecPaths(
  specPaths: string[],
  specRootPath: string | undefined,
  baseOutput: OutputDetails,
  nextOutput: OutputDetails
): CompareRun[] {
  const runs: CompareRun[] = [];

  for (const specPath of specPaths) {
    const fullSpecPath = path.resolve(specRootPath || ".", specPath);
    runs.push({
      fullSpecPath,
      baseOutput: {
        ...baseOutput,
        outputPath: path.join(
          baseOutput.outputPath,
          specRootPath ? specPath : ""
        )
      },
      nextOutput: {
        ...nextOutput,
        outputPath: path.join(
          nextOutput.outputPath,
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
Usage: autorest-compare --language [spec arguments] --output-path=[generated output path] --compare-base [run arguments] --compare-next [run arguments]

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

  --compare-base[:path] [run arguments]        Indicates that what follows are arguments for the base of the comparison.

                                               You may also pass a path to an existing folder of output from a previous
                                               AutoRest run: --compare-base:path/to/existing/output.  If a --spec-root-path
                                               is provided, it is expected that the existing output will be located
                                               in a subpath equal to the relative path of a --spec-path parameter and
                                               the --spec-root-path.

                                               NOTE: When you use an existing output path, all following arguments for
                                               --compare-base will be ignored.

  --compare-next [run arguments]               Indicates that what follows are arguments for the next/new result for
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
    let baseCompareOptions: AutoRestOptions = {};
    let nextCompareOptions: AutoRestOptions = {};

    let baseOutputDetails: OutputDetails | undefined;
    let nextOutputDetails: OutputDetails | undefined;

    while (args.length > 0) {
      const [argName, argValue] = parseArgument(args.shift());
      if (argName === `compare-base`) {
        if (argValue) {
          baseOutputDetails = {
            outputPath: argValue,
            useExisting: true
          };
        } else {
          [baseCompareOptions, args] = getAutoRestOptionsFromArgs(args);
        }
      } else if (argName === `compare-next`) {
        if (argValue) {
          nextOutputDetails = {
            outputPath: argValue,
            useExisting: true
          };
        } else {
          [nextCompareOptions, args] = getAutoRestOptionsFromArgs(args);
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
    baseCompareOptions = {
      ...baseCompareOptions,
      debug: baseCompareOptions.debug || debug
    };
    nextCompareOptions = {
      ...nextCompareOptions,
      debug: nextCompareOptions.debug || debug
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
      (!baseOutputDetails.useExisting || !nextOutputDetails.useExisting) &&
      outputPath === undefined
    ) {
      throw new Error(
        "An output path must be provided with the --output-path parameter."
      );
    }

    let runs: CompareRun[] = [];
    if (baseOutputDetails.useExisting && nextOutputDetails.useExisting) {
      runs.push({
        baseOutput: baseOutputDetails,
        nextOutput: nextOutputDetails
      });
    } else if (specPaths.length === 0) {
      throw new Error(
        "A spec path must be provided with the --spec-path parameter."
      );
    } else {
      runs = getRunsFromSpecPaths(
        specPaths,
        specRootPath,
        baseOutputDetails || {
          outputPath: path.resolve(outputPath, "base"),
          useExisting: false
        },
        nextOutputDetails || {
          outputPath: path.resolve(outputPath, "next"),
          useExisting: false
        }
      );
    }

    console.log(`*** Comparing output of ${language} generator...`);

    for (const run of runs) {
      if (run.fullSpecPath) {
        console.log("*** Generating code for spec at path:", run.fullSpecPath);
      } else {
        console.log(`*** Comparing existing output in paths:
    ${run.baseOutput.outputPath}
    ${run.nextOutput.outputPath}`);
      }

      // Run two instances of AutoRest simultaneously
      const baseRunPromise = runAutoRest(
        language,
        run.fullSpecPath || "",
        run.baseOutput,
        baseCompareOptions
      );

      const nextRunPromise = runAutoRest(
        language,
        run.fullSpecPath || "",
        run.nextOutput,
        nextCompareOptions
      );

      const [baseResult, nextResult] = await Promise.all([
        baseRunPromise,
        nextRunPromise
      ]);

      if (baseCompareOptions.debug) {
        if (baseResult.processOutput) {
          console.log("\n*** Base AutoRest Output:\n");
          console.log(baseResult.processOutput);
        }
        console.log(`\n*** Output files under ${baseResult.outputPath}:
${baseResult.outputFiles.map(f => "    " + f).join("\n")}`);
      }

      if (nextCompareOptions.debug) {
        if (nextResult.processOutput) {
          console.log("\n*** Next AutoRest Output:\n");
          console.log(nextResult.processOutput);
        }

        console.log(`\n*** Output files under ${nextResult.outputPath}:
${nextResult.outputFiles.map(f => "    " + f).join("\n")}`);
      }

      console.log("\n*** Generation complete, comparing results...");

      const compareResult = compareOutputFiles(baseResult, nextResult, {
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
