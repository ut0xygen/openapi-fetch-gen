import type { InterfaceDeclaration, SourceFile } from "ts-morph";
export declare function throwError(message: string): never;
export declare function sanitizeForOp(operation: string): string;
export declare function toCamelCasePath(path: string, isUpper?: boolean): string;
export declare function findInterface(sourceFile: SourceFile, interfaceName: string): InterfaceDeclaration | undefined;
//# sourceMappingURL=utils.d.ts.map