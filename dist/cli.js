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
    .parse(process.argv);
const options = program.opts();
try {
    const start = Date.now() / 1000.0;
    const inputPath = node_path_1.default.resolve(options["input"]);
    const outputPath = node_path_1.default.resolve(options["output"]);
    const useOperationId = options["useOperationId"] || false;
    if (!node_fs_1.default.existsSync(inputPath)) {
        console.error(`Error: Input file not found: ${inputPath}`);
        process.exit(1);
    }
    const clientCode = (0, index_1.generateClient)(inputPath, { useOperationId });
    node_fs_1.default.writeFileSync(outputPath, clientCode);
    const end = Date.now() / 1000.0;
    console.log(`🏁 Successfully generated client at [${(end - start).toFixed(2)}ms]: ${outputPath}`);
}
catch (error) {
    console.error("😵 Error:", error instanceof Error ? error.message : String(error));
    process.exit(1);
}
//# sourceMappingURL=cli.js.map