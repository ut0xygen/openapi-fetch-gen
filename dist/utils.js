"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.throwError = throwError;
exports.sanitizeForOp = sanitizeForOp;
exports.toCamelCasePath = toCamelCasePath;
exports.findInterface = findInterface;
function throwError(message) {
    throw new Error(message);
}
function sanitizeForOp(operation) {
    return operation
        .replace(/[{}]/g, "")
        .replace(/[-/.]/g, "_")
        .replace(/^_/, "");
}
function toCamelCasePath(path, isUpper = false) {
    return sanitizeForOp(path)
        .split("_")
        .map((segment, index) => index === 0 && !isUpper
        ? segment.toLowerCase()
        : segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase())
        .join("");
}
function findInterface(sourceFile, interfaceName) {
    return sourceFile.getInterfaces().find((i) => i.getName() === interfaceName);
}
//# sourceMappingURL=utils.js.map