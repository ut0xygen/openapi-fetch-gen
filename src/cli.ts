#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { Command } from "commander";
import { version } from "../package.json";
import { generateClient } from "./index";

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
    "--default-headers <comma_separated_names_of_headers>",
    "header names so that the generated client includes the default HTTP headers across all endpoints",
    "",
  )
  .parse(process.argv);

const options = program.opts();

try {
  const inputPath = path.resolve(options["input"]);
  const outputPath = path.resolve(options["output"]);
  const defaultHeaderNamesString = options["defaultHeaders"] as string;

  if (!fs.existsSync(inputPath)) {
    console.error(`Error: Input file not found: ${inputPath}`);
    process.exit(1);
  }

  const defaultHeaderNames = defaultHeaderNamesString
    .split(",")
    .map((h) => h.trim())
    .filter((h) => h !== "");

  const clientCode = generateClient(inputPath, defaultHeaderNames);

  fs.writeFileSync(outputPath, clientCode);
  console.log(`Successfully generated client at: ${outputPath}`);
} catch (error) {
  console.error(
    "Error:",
    error instanceof Error ? error.message : String(error),
  );
  process.exit(1);
}
