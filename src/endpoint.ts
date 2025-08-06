import { type InterfaceDeclaration, Node, SyntaxKind } from "ts-morph";
import { sanitizeForOp, throwError, toCamelCasePath } from "./utils";

export interface Endpoint {
  path: string;
  method: string;
  opName: string;
  opId: string | null;
  headerType: string | null;
  queryType: string | null;
  pathType: string | null;
  bodyType: string | null;
  bodyContentType: string | null;
  optsType: string | null;
}

export function extractEndpointsInfo(
  pathsIf: InterfaceDeclaration,
): Endpoint[] {
  const eps: Endpoint[] = [];

  pathsIf.getProperties().forEach((prop) => {
    const propType = prop.getType();
    ["get", "post", "put", "delete", "patch", "head", "options"].forEach(
      (method) => {
        const decl = (() => {
          const methodProp = propType.getProperty(method);

          return methodProp &&
            methodProp.getTypeAtLocation(prop).getText() !== "never"
            ? methodProp
            : null;
        })()?.getDeclarations()?.[0];
        if (!decl || !Node.isPropertySignature(decl)) {
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
        const opName = `${method}${toCamelCasePath(path, true)}`;
        const opId = (() => {
          const tn = decl.getTypeNodeOrThrow();
          if (
            !Node.isIndexedAccessTypeNode(tn) ||
            tn.getObjectTypeNode().getText() !== "operations"
          ) {
            return null;
          }

          const idxTn = tn.getIndexTypeNode();
          if (
            !Node.isLiteralTypeNode(idxTn) ||
            idxTn.getLiteral().getKind() !== SyntaxKind.StringLiteral
          ) {
            return null;
          }

          return sanitizeForOp(idxTn.getLiteral().getText().slice(1, -1));
        })();
        const headerType = paramTypes.find((kv) => kv.name === "header");
        const queryType = paramTypes.find((kv) => kv.name === "query");
        const pathType = paramTypes.find((kv) => kv.name === "path");
        const [bodyType, bodyContentType]: [string | null, string | null] =
          (() => {
            const requestBodyType = decl
              .getType()
              .getProperty("requestBody")
              ?.getTypeAtLocation(decl);
            if (!requestBodyType || requestBodyType.getText() === "never") {
              return [null, null];
            }

            const contentType =
              requestBodyType
                .getPropertyOrThrow("content")
                .getTypeAtLocation(decl)
                .getProperties()?.[0] ??
              throwError("No content type found in requestBody");

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
        let optsType: string | null = null;
        if (headerType) {
          const epHeader = headerType["text"];
          const keysIncludedInBothHeaders = `Extract<keyof HT, keyof ${epHeader}>`;
          const keysIncludedOnlyInEpHeader = `Exclude<keyof ${epHeader}, ${keysIncludedInBothHeaders}>`;
          const typePickedByKeysIncludedOnlyInEpHeader = `Pick<${epHeader}, ${keysIncludedOnlyInEpHeader}>`;
          const typeDisallowedKeysIncludedInBothHeaders = `Partial<Record<${keysIncludedInBothHeaders}, never>>`;
          optsType =
            // When the default headers cover all the headers (i.e. `Exclude<...>` derived as `never`),
            // header parameter becomes optional (omitting or )overriding default headers.
            // Else, header parameter is required as either follows:
            // 1. requires sorely missed header values
            // 2. requires all the header values (overriding default headers)
            `(
            [${keysIncludedOnlyInEpHeader}] extends [never]
                ? {
                    header?: ${epHeader}
                }
                : {
                    header:
                        | (
                            ${typePickedByKeysIncludedOnlyInEpHeader}
                            & ${typeDisallowedKeysIncludedInBothHeaders}
                        )
                        | ${epHeader}
                }
            ) & {
                ${nonHeaderParams.join(",\n                ")}
            }`;
        } else {
          optsType =
            nonHeaderParams.length > 0
              ? `{
            ${nonHeaderParams.join(",            \n")}
        }`
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
      },
    );
  });

  return eps;
}
