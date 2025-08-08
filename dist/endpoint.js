"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractEndpointsInfo = extractEndpointsInfo;
const ts_morph_1 = require("ts-morph");
const utils_1 = require("./utils");
function extractEndpointsInfo(pathsIf) {
    const eps = [];
    pathsIf.getProperties().forEach((prop) => {
        const propType = prop.getType();
        ["get", "post", "put", "delete", "patch", "head", "options"].forEach((method) => {
            const decl = (() => {
                const methodProp = propType.getProperty(method);
                return methodProp &&
                    methodProp.getTypeAtLocation(prop).getText() !== "never"
                    ? methodProp
                    : null;
            })()?.getDeclarations()?.[0];
            if (!decl || !ts_morph_1.Node.isPropertySignature(decl)) {
                return;
            }
            const paramTypes = decl
                .getType()
                .getPropertyOrThrow("parameters")
                .getTypeAtLocation(decl)
                .getProperties()
                .map((prop) => ({
                name: prop.getName(),
                text: prop.getTypeAtLocation(decl).getText(),
            }))
                .filter((kv) => kv["text"] !== "never");
            const path = prop.getName().replace(/['"]/g, "");
            const opName = `${method}${(0, utils_1.toCamelCasePath)(path, true)}`;
            const opId = (() => {
                const tn = decl.getTypeNodeOrThrow();
                if (!ts_morph_1.Node.isIndexedAccessTypeNode(tn) ||
                    tn.getObjectTypeNode().getText() !== "operations") {
                    return null;
                }
                const idxTn = tn.getIndexTypeNode();
                if (!ts_morph_1.Node.isLiteralTypeNode(idxTn) ||
                    idxTn.getLiteral().getKind() !== ts_morph_1.SyntaxKind.StringLiteral) {
                    return null;
                }
                return (0, utils_1.sanitizeForOp)(idxTn.getLiteral().getText().slice(1, -1));
            })();
            const headerType = paramTypes.find((kv) => kv.name === "header");
            const queryType = paramTypes.find((kv) => kv.name === "query");
            const pathType = paramTypes.find((kv) => kv.name === "path");
            const [bodyType, bodyContentType] = (() => {
                const requestBodyType = decl
                    .getType()
                    .getProperty("requestBody")
                    ?.getTypeAtLocation(decl);
                if (!requestBodyType || requestBodyType.getText() === "never") {
                    return [null, null];
                }
                const contentType = requestBodyType
                    .getPropertyOrThrow("content")
                    .getTypeAtLocation(decl)
                    .getProperties()?.[0] ??
                    (0, utils_1.throwError)("No content type found in requestBody");
                return [
                    contentType.getTypeAtLocation(decl).getText(),
                    contentType.getName(),
                ];
            })();
            const nonHeaderParams = [
                ...paramTypes,
                {
                    name: "body",
                    text: bodyType ?? "",
                },
            ]
                .filter((kv) => kv.name !== "header" && kv.text !== "")
                .map((kv) => `${kv.name}: ${kv.text}`);
            let optsType = null;
            if (headerType) {
                const epHeader = `Omit<${headerType["text"]}, "Content-Type">`;
                const keysIncludedInBothHeaders = `Extract<keyof HT, keyof ${epHeader}>`;
                const keysIncludedOnlyInEpHeader = `Exclude<keyof ${epHeader}, ${keysIncludedInBothHeaders}>`;
                const typePickedByKeysIncludedOnlyInEpHeader = `Pick<${epHeader}, ${keysIncludedOnlyInEpHeader}>`;
                const typeDisallowedKeysIncludedInBothHeaders = `Partial<Record<${keysIncludedInBothHeaders}, never>>`;
                optsType =
                    `(
            [${keysIncludedOnlyInEpHeader}] extends [never]
                ? { header?: ${epHeader} }
                : {
                    header:
                        | (
                            ${typePickedByKeysIncludedOnlyInEpHeader}
                            & ${typeDisallowedKeysIncludedInBothHeaders}
                        )
                        | ${epHeader}
                }
            ) & { ${nonHeaderParams.join(",\n                ")} }`;
            }
            else {
                optsType =
                    nonHeaderParams.length > 0
                        ? `{ ${nonHeaderParams.join(",            \n")}}`
                        : null;
            }
            eps.push({
                path,
                method,
                opName,
                opId,
                headerType: headerType ? headerType["text"] : null,
                queryType: queryType ? queryType["text"] : null,
                pathType: pathType ? pathType["text"] : null,
                bodyType,
                bodyContentType,
                optsType,
            });
        });
    });
    return eps;
}
//# sourceMappingURL=endpoint.js.map