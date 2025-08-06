#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { Command } from "commander";
import { version } from "../package.json";
import { genClient } from "./index";

const program = new Command();

program
  .name("openapi-fetch-gen")
  .description(
    "Generate TypeScript API client from OpenAPI TypeScript definitions",
  )
  .version(version)
  .requiredOption(
    "-i, --input <path>",
    "path to input OpenAPI TypeScript definition file",
  )
  .option(
    "-o, --output <path>",
    "path to output generated client file",
    "./client.ts",
  )
  .option(
    "--use-operation-id",
    "use operationId from OpenAPI schema for method names instead of generating from path",
    false,
  )
  .option(
    "--schema-import-path-prefix <prefix>",
    "prefix for the import path of the OpenAPI schema",
    "",
  )
  .parse(process.argv);

const options = program.opts();

try {
  const tStart = Date.now() / 1000.0;

  const pathIn = path.resolve(options["input"]);
  const pathOut = path.resolve(options["output"]);
  const useOperationId = options["useOperationId"] || false;
  const schemaImportPathPrefix = options["schemaImportPathPrefix"] || undefined;

  if (!fs.existsSync(pathIn)) {
    console.error(`Error: Input file not found: ${pathIn}`);
    process.exit(1);
  }

  fs.writeFileSync(
    pathOut,
    genClient(pathIn, { useOperationId, schemaImportPathPrefix }),
  );

  console.log(
    `🏁 Successfully generated client at [${(
      Date.now() / 1000.0 - tStart
    ).toFixed(2)}ms]: ${pathOut}`,
  );
} catch (error) {
  console.error(
    "😵 Error:",
    error instanceof Error ? error.message : String(error),
  );
  process.exit(1);
}
