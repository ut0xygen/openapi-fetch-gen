#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { Command } from "commander";
import { generateClient } from "./index";

const program = new Command();

program
  .name("openapi-fetch-gen")
  .description(
    "Generate TypeScript API client from OpenAPI TypeScript definitions",
  )
  .version("0.1.0")
  .requiredOption(
    "-i, --input <path>",
    "path to input OpenAPI TypeScript definition file",
  )
  .option(
    "-o, --output <path>",
    "path to output generated client file",
    "./client.ts",
  )
  .option("-p, --paths-type <name>", "paths interface type name", "paths")
  .option(
    "-c, --components-type <name>",
    "components interface type name",
    "components",
  )
  .option(
    "-b, --base-url <url>",
    "base URL for the API client",
    "https://example.com/",
  )
  .parse(process.argv);

const options = program.opts();

try {
  const inputPath = path.resolve(options.input);
  const outputPath = path.resolve(options.output);

  if (!fs.existsSync(inputPath)) {
    console.error(`Error: Input file not found: ${inputPath}`);
    process.exit(1);
  }

  const clientCode = generateClient({
    schemaPath: inputPath,
    pathsTypeName: options.pathsType,
    componentsTypeName: options.componentsType,
    baseUrl: options.baseUrl,
  });

  fs.writeFileSync(outputPath, clientCode);
  console.log(`Successfully generated client at: ${outputPath}`);
} catch (error) {
  console.error(
    "Error:",
    error instanceof Error ? error.message : String(error),
  );
  process.exit(1);
}
