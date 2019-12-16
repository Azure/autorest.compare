import * as chalk from "chalk";
import { CompareMessage, MessageType } from "./comparers";

const outputColors = {
  "-": chalk.redBright,
  "~": chalk.yellowBright
};

interface MessageVisual {
  prefix: string;
  color: chalk.ChalkFunction;
}

function getMessageVisual(messageType: MessageType): MessageVisual {
  let prefix = "•";
  let color: chalk.ChalkFunction = msg => msg;

  switch (messageType) {
    case MessageType.Added:
      prefix = "+";
      color = chalk.greenBright;
      break;
    case MessageType.Removed:
      prefix = "-";
      color = chalk.redBright;
      break;
    case MessageType.Changed:
      prefix = "~";
      color = chalk.yellowBright;
      break;

    default:
      // Default already handled
      break;
  }

  return {
    prefix,
    color
  };
}

/**
 * Prints a CompareMessage and its children in a human-readable way
 */
export function printCompareMessage(
  compareMessage: CompareMessage,
  indentLevel: number = 0
): void {
  const { message, type: messageType, children } = compareMessage;
  const messageVisual = getMessageVisual(messageType);

  console.log(
    messageVisual.color(
      `${"".padEnd(indentLevel * 2)}${messageVisual.prefix} ${message}`
    )
  );

  if (children) {
    const childIndent = indentLevel + 1;
    children.forEach(child => {
      printCompareMessage(child, childIndent);
    });
  }
}
