#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const commander_1 = require("commander");
const package_json_1 = require("../package.json");
const index_1 = require("./index");
const program = new commander_1.Command();
program
    .name("openapi-fetch-gen")
    .description("Generate TypeScript API client from OpenAPI TypeScript definitions")
    .version(package_json_1.version)
    .requiredOption("-i, --input <path>", "path to input OpenAPI TypeScript definition file")
    .option("-o, --output <path>", "path to output generated client file", "./client.ts")
    .option("--use-operation-id", "use operationId from OpenAPI schema for method names instead of generating from path", false)
    .option("--schema-import-path-prefix <dir>", "prefix for the import path of the OpenAPI schema", "")
    .parse(process.argv);
const options = program.opts();
try {
    const tStart = Date.now() / 1000.0;
    const pathIn = node_path_1.default.resolve(options["input"]);
    const pathOut = node_path_1.default.resolve(options["output"]);
    const useOperationId = options["useOperationId"] || false;
    const schemaImportPathPrefix = options["schemaImportPathPrefix"] || undefined;
    if (!node_fs_1.default.existsSync(pathIn)) {
        console.error(`Error: Input file not found: ${pathIn}`);
        process.exit(1);
    }
    node_fs_1.default.writeFileSync(pathOut, (0, index_1.genClient)(pathIn, { useOperationId, schemaImportPathPrefix }));
    console.log(`🏁 Successfully generated client at [${(Date.now() / 1000.0 - tStart).toFixed(2)}ms]: ${pathOut}`);
}
catch (error) {
    console.error("😵 Error:", error instanceof Error ? error.message : String(error));
    process.exit(1);
}
//# sourceMappingURL=cli.js.map