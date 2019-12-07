// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { AutoRestOptions } from "./runner";

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
 * Builds an AutoRestOptions instance from the arguments contained in the args
 * array, stopping when an argument may indicate a different option set.
 */
export function getAutoRestOptionsFromArgs(
  args: string[]
): [AutoRestOptions, string[]] {
  const options: AutoRestOptions = {
    useArgs: []
  };

  while (args.length > 0) {
    const arg = args.shift();
    const [argName, argValue] = parseArgument(arg);

    if (argName === "compare-base" || argName === "compare-next") {
      args.unshift(arg);
      break;
    } else if (argName === "version") {
      options.version = argValue;
    } else if (argName === "beta") {
      options.useBeta = argValue === "true";
    } else if (argName === "use") {
      options.useArgs.push(argValue);
    } else if (argName === "debug") {
      options.debug = argValue === "true";
    }
  }

  return [options, args];
}
