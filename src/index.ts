// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import * as path from "path";
import { getDefaultComparers } from "./comparers";
import { parseArgument, getAutoRestOptionsFromArgs } from "./cli";
import {
  runAutoRest,
  AutoRestOptions,
  AutoRestLanguage,
  AutoRestLanguages
} from "./runner";

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

  --spec-path=<path to .json or spec folder>   Use the specified spec path for code generation
  --azure-specs[=""]                           Use the azure-rest-api-specs repository for code generation.
                                               The value of this parameter can either be a comma-separated list
                                               of relative paths under the 'specifications' folder of this repository
                                               or omitted entirely to generate code for every spec in the repository.

Output Arguments

  --output-path=[generated output path]        The path where generated source files will be omitted.  This should
                                               generally be under a temporary file path.
Comparison Arguments

  --compare-base [run arguments]               Indicates that what follows are arguments for the base of the comparison
  --compare-next [run arguments]               Indicates that what follows are arguments for the next/new result for
                                               the comparison.

Run Arguments

  --use:<package@version>                      Use a specific AutoRest core, language, or extension package
  --beta                                       Use the 'autorest-beta' (AutoRest v3) command instead of 'autorest'
  --debug                                      Write debug output for the AutoRest run

`.trimLeft()
    );
  } else {
    // TODO: Accept this as a CLI parameter
    const specsToGenerate = ["redis/resource-manager"];

    const specRepoRoot = path.resolve(
      __dirname,
      "../../..",
      "azure-rest-api-specs"
    );

    // Build configuration from arguments
    let language: AutoRestLanguage | undefined;
    let baseCompareOptions: AutoRestOptions = {};
    let nextCompareOptions: AutoRestOptions = {};

    while (args.length > 0) {
      const [argName] = parseArgument(args.shift());
      if (argName === `compare-base`) {
        [baseCompareOptions, args] = getAutoRestOptionsFromArgs(args);
      } else if (argName === `compare-next`) {
        [nextCompareOptions, args] = getAutoRestOptionsFromArgs(args);
      } else if (AutoRestLanguages.indexOf(argName as AutoRestLanguage) > -1) {
        language = argName as AutoRestLanguage;
      }
    }

    if (language === undefined) {
      throw new Error(
        `Missing language parameter.  Please use one of the following:\n${[
          "",
          ...AutoRestLanguages
        ].join("\n    --")}\n`
      );
    }

    console.log(`*** Comparing output of ${language} generator...`);

    for (const specPath of specsToGenerate) {
      const fullSpecPath = path.resolve(
        specRepoRoot,
        "specification",
        specPath
      );
      const outputPath = path.resolve(
        __dirname,
        "generated",
        language,
        specPath
      );

      console.log("*** Generating code for spec at path:", fullSpecPath);

      // Run two instances of AutoRest simultaneously
      const baseRunPromise = runAutoRest(
        language,
        fullSpecPath,
        path.join(outputPath, "base"),
        baseCompareOptions
      );
      const nextRunPromise = runAutoRest(
        language,
        fullSpecPath,
        path.join(outputPath, "next"),
        nextCompareOptions
      );

      const [baseResult, nextResult] = await Promise.all([
        baseRunPromise,
        nextRunPromise
      ]);

      if (baseCompareOptions.debug) {
        console.log("\nBase AutoRest Output:\n");
        console.log(baseResult.processOutput);
      }
      if (nextCompareOptions.debug) {
        console.log("\nNext AutoRest Output:\n");
        console.log(nextResult.processOutput);
      }

      console.log("*** Generation complete, comparing results...");

      for (const comparer of getDefaultComparers()) {
        await comparer(baseResult, nextResult);
      }

      console.log(
        "\nComparison complete, no meaningful differences detected!\n"
      );
    }
  }
}

main().catch(err => {
  console.error(
    "\nAn error occurred while running the validation script:\n\n",
    err.toString()
  );
  process.exit(1);
});
