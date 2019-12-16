// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import * as path from "path";
import { AutoRestResult } from "./runner";

export type Comparer<TItem extends NamedItem> = (
  oldItem: TItem,
  newItem: TItem
) => CompareResult;

export interface NamedItem {
  name: string;
}

export interface OrderedItem {
  ordinal: number;
}

export interface FileDetails {
  name: string;
  basePath: string;
}

export enum MessageType {
  Outline,
  Added,
  Removed,
  Changed
}

export type CompareMessage = {
  message: string;
  type: MessageType;
  children?: CompareMessage[];
};

export type CompareResult = CompareMessage | undefined;

export function prepareResult(
  message: string,
  messageType: MessageType,
  results: CompareResult[]
): CompareResult {
  const children = results.filter(r => r !== undefined);
  return children.length > 0
    ? {
        message,
        type: messageType,
        children
      }
    : undefined;
}

export function compareItems<TItem extends NamedItem>(
  resultMessage: string,
  messageType: MessageType,
  oldItems: TItem[],
  newItems: TItem[],
  compareFunc: Comparer<TItem>,
  isOrderSignificant?: boolean
): CompareResult {
  const messages: CompareMessage[] = [];
  let orderChanged = false;

  // Build an index of the new items
  const oldItemIndex: object = {};
  for (const oldItem of oldItems) {
    oldItemIndex[oldItem.name] = oldItem;
  }

  for (const newItem of newItems) {
    if (newItem.name in oldItemIndex) {
      // Delete the item from the index because it exists in both
      const oldItem = oldItemIndex[newItem.name];
      delete oldItemIndex[newItem.name];

      // If the items are ordered, compare the order
      if (isOrderSignificant && orderChanged === false) {
        const oldOrder: number | undefined = (oldItem as any).ordinal;
        const newOrder: number | undefined = (newItem as any).ordinal;

        orderChanged =
          oldOrder !== undefined &&
          newOrder !== undefined &&
          oldOrder !== newOrder;

        if (orderChanged) {
          messages.push({
            message: "Order Changed",
            type: MessageType.Outline,
            children: [
              {
                message: oldItems.map(i => i.name).join(", "),
                type: MessageType.Removed
              },
              {
                message: newItems.map(i => i.name).join(", "),
                type: MessageType.Added
              }
            ]
          });
        }
      }

      // Compare the two items and store the result if one was
      // returned because this indicates a difference
      const result = compareFunc(oldItem, newItem);
      if (result) {
        messages.push(result);
      }
    } else {
      messages.push({
        message: newItem.name,
        type: MessageType.Added
      });
    }
  }

  // If there are any items left in oldItemIndex it means they
  // were not present in newItems
  for (const oldItemName of Object.keys(oldItemIndex)) {
    // Insert removed items at the front of the list
    messages.unshift({
      message: oldItemName,
      type: MessageType.Removed
    });
  }

  return prepareResult(resultMessage, messageType, messages);
}

export function compareValue(
  message: string,
  oldValue: any,
  newValue: any
): CompareResult {
  return oldValue !== newValue
    ? {
        message,
        type: MessageType.Outline,
        children: [
          { message: `${oldValue}`, type: MessageType.Removed },
          { message: `${newValue}`, type: MessageType.Added }
        ]
      }
    : undefined;
}

/**
 * Represents an object with file extensions ("ts", "json", etc) as keys and
 * file comparer functions as the associated values.
 */
export interface ComparerIndex {
  [key: string]: Comparer<FileDetails>;
}

/**
 * Specifies options for comparing source files.
 */
export interface CompareSourceOptions {
  comparersByType: ComparerIndex;
}

export function compareFile(
  oldFile: FileDetails,
  newFile: FileDetails,
  options: CompareSourceOptions
): CompareResult {
  const extension = path.extname(oldFile.name).substr(1);
  const comparer = options.comparersByType[extension];
  return comparer ? comparer(oldFile, newFile) : undefined;
}

export function compareOutputFiles(
  baseResult: AutoRestResult,
  nextResult: AutoRestResult,
  options: CompareSourceOptions
): CompareResult {
  return compareItems(
    "Generated Output Files",
    MessageType.Outline,
    baseResult.outputFiles.map(file => ({
      name: file,
      basePath: baseResult.outputPath
    })),
    nextResult.outputFiles.map(file => ({
      name: file,
      basePath: nextResult.outputPath
    })),
    (oldFile, newFile) => compareFile(oldFile, newFile, options)
  );
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
