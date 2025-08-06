import type { InterfaceDeclaration, SourceFile } from "ts-morph";

export function throwError(message: string): never {
  throw new Error(message);
}

export function sanitizeForOp(operation: string): string {
  return operation
    .replace(/[{}]/g, "")
    .replace(/[-/.]/g, "_")
    .replace(/^_/, ""); // Remove leading underscore if present
}

export function toCamelCasePath(path: string, isUpper = false): string {
  return sanitizeForOp(path)
    .split("_")
    .map((segment, index) =>
      index === 0 && !isUpper
        ? segment.toLowerCase()
        : segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase(),
    )
    .join("");
}

export function findInterface(
  sourceFile: SourceFile,
  interfaceName: string,
): InterfaceDeclaration | undefined {
  return sourceFile.getInterfaces().find((i) => i.getName() === interfaceName);
}
