#!/usr/bin/env node
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { runOperation } from "./operations";
import { AutoRestLanguages } from "./runner";
import { getOperationFromArgs } from "./cli";

async function main(): Promise<void> {
  let args = process.argv.slice(2);
  const languageArgsString = ["", ...AutoRestLanguages].join("\n  --");

  // First, check for the --help parameter, or no parameters at all
  if (args.length === 0 || args[0] === "--help") {
    console.log(
      `
Usage: autorest-compare --compare --language:[language-name] [spec arguments] --output-path=[generated output path] --old-args [AutoRest arguments] --new-args [AutoRest arguments]
       autorest-compare --compare:config.yaml [--language:language-name] [--use-baseline]
       autorest-compare --generate-baseline:config.yaml [--language:language-name]

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

  --old-args[:path] [run arguments]            Indicates that what follows are arguments for the old of the comparison.

                                               You may also pass a path to an existing folder of output from a previous
                                               AutoRest run: --compare-old:path/to/existing/output.  If a --spec-root-path
                                               is provided, it is expected that the existing output will be located
                                               in a subpath equal to the relative path of a --spec-path parameter and
                                               the --spec-root-path.

                                               NOTE: When you use an existing output path, all following arguments for
                                               --compare-old will be ignored.

  --compare-new [run arguments]                Indicates that what follows are arguments for the new/new result for
                                               the comparison.

`.trimLeft()
    );
  } else {
    const [operation, runConfig] = getOperationFromArgs(args);
    await runOperation(operation, runConfig);

    process.exit(operation.getExitCode());
  }
}

main().catch(err => {
  console.error("\nAn error occurred during execution:\n\n", err);
  process.exit(1);
});
