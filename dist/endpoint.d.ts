import { type InterfaceDeclaration } from "ts-morph";
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
export declare function extractEndpointsInfo(pathsIf: InterfaceDeclaration): Endpoint[];
//# sourceMappingURL=endpoint.d.ts.map