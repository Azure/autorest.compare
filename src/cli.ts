// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import * as path from "path";
import { AutoRestLanguages, AutoRestLanguage } from "./runner";
import {
  RunConfiguration,
  loadConfiguration,
  SpecConfiguration,
  LanguageConfiguration
} from "./config";
import { CompareOperation, BaselineOperation, Operation } from "./operations";

/**
 * Parses an argument of one of the following forms and returns the argument and
 * possible value as a tuple:
 *
 * --arg (value is 'true')
 * --arg=value
 * --arg:value (same as above)
 */
export function parseArgument(argument: string): [string, string] {
  const match = /^--([^=:]+)([=:](.+))?$/g.exec(argument);
  if (match) {
    return [match[1], match[3] || "true"];
  } else {
    throw Error(`Unexpected argument string: ${argument}`);
  }
}

/**
 * Returns a tuple of the AutoRest args and any remaining arguments at the point
 * where a boundary argument (--old-args or --new-args) is encountered.
 */
export function getAutoRestArgs(args: string[]): [string[], string[]] {
  const autoRestArgs = [];

  while (args.length > 0) {
    const arg = args.shift();
    const [argName, _] = parseArgument(arg);

    if (argName === "old-args" || argName === "new-args") {
      args.unshift(arg);
      break;
    } else {
      autoRestArgs.push(arg);
    }
  }

  return [autoRestArgs, args];
}

function getCompareConfiguration(args: string[]): RunConfiguration {
  let languageConfig: LanguageConfiguration = {
    language: undefined,
    outputPath: undefined,
    oldArgs: [],
    newArgs: []
  };

  let specConfig: SpecConfiguration = {
    specRootPath: undefined,
    specPaths: []
  };

  let compareConfig: RunConfiguration = {
    debug: false,
    specs: [specConfig],
    languages: [languageConfig]
  };

  while (args.length > 0) {
    const [argName, argValue] = parseArgument(args.shift());
    if (argName === `old-args`) {
      [languageConfig.oldArgs, args] = getAutoRestArgs(args);
    } else if (argName === `new-args`) {
      [languageConfig.newArgs, args] = getAutoRestArgs(args);
    } else if (argName === `spec-path`) {
      specConfig.specPaths.push(argValue);
    } else if (argName === `spec-root-path`) {
      specConfig.specRootPath = argValue;
    } else if (argName === `output-path`) {
      languageConfig.outputPath = argValue;
    } else if (argName === `use-existing-output`) {
      if (argValue === "old" || argValue === "all" || argValue === "none") {
        languageConfig.useExistingOutput = argValue;
      } else {
        throw new Error(
          `Unexpected value for --use-existing-output: ${argValue}`
        );
      }
    } else if (argName === "debug") {
      compareConfig.debug = argValue === "true";
    } else if (AutoRestLanguages.indexOf(argName as AutoRestLanguage) > -1) {
      languageConfig.language = argName as AutoRestLanguage;
    }
  }

  // Add debug flags if --debug was set globally
  if (compareConfig.debug) {
    languageConfig.oldArgs.push("--debug");
    languageConfig.newArgs.push("--debug");
  }

  if (languageConfig.language === undefined) {
    throw new Error(
      `Missing language parameter.  Please use one of the following:\n${[
        "",
        ...AutoRestLanguages
      ].join("\n    --")}\n`
    );
  }

  if (languageConfig.outputPath === undefined) {
    throw new Error(
      "An output path must be provided with the --output-path parameter."
    );
  }

  if (specConfig.specPaths.length === 0) {
    throw new Error(
      "A spec path must be provided with the --spec-path parameter."
    );
  }

  return compareConfig;
}

function getBaselineConfiguration(args: string[]): RunConfiguration {
  let configPath: string;
  let compareConfig: RunConfiguration;
  let languageToRun: string;

  while (args.length > 0) {
    const arg = args.shift();
    const [argName, argValue] = parseArgument(arg);
    if (argName === "generate-baseline") {
      // TODO: Error when no path given
      configPath = argValue;
      compareConfig = loadConfiguration(configPath);
    } else if (argName === "language") {
      languageToRun = argValue;
    } else {
      throw Error(`Unexpected argument: ${arg}`);
    }
  }

  // Resolve paths relative to configuration file
  const fullConfigPath = path.dirname(path.resolve(configPath));
  compareConfig = {
    ...compareConfig,
    specs: compareConfig.specs.map(resolveSpecRootPath(fullConfigPath)),
    languages: compareConfig.languages.map(resolveOutputPath(fullConfigPath))
  };

  // Filter language configurations to desired language
  if (languageToRun) {
    compareConfig.languages = [
      compareConfig.languages.find(l => l.language === languageToRun)
    ];
    // TODO: Throw if empty
  }

  return compareConfig;
}

function resolveSpecRootPath(configPath: string) {
  return function(specConfig: SpecConfiguration): SpecConfiguration {
    return {
      ...specConfig,
      specRootPath: path.resolve(configPath, specConfig.specRootPath)
    };
  };
}

function resolveOutputPath(configPath: string) {
  return function(
    languageConfig: LanguageConfiguration
  ): LanguageConfiguration {
    return {
      ...languageConfig,
      outputPath: path.resolve(configPath, languageConfig.outputPath)
    };
  };
}

export function getOperationFromArgs(
  args: string[]
): [Operation, RunConfiguration] {
  if (args[0].startsWith("--compare")) {
    return [new CompareOperation(), getCompareConfiguration(args)];
  } else if (args[0].startsWith("--generate-baseline")) {
    return [new BaselineOperation(), getBaselineConfiguration(args)];
  }
}
