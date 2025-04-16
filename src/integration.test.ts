import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { generateClient } from "./index";

describe("Integration tests", () => {
  const smallSchemaPath = path.resolve(
    __dirname,
    "../test-integration-schema.d.ts",
  );
  const outputClientPath = path.resolve(
    __dirname,
    "../test-integration-client.ts",
  );
  const compiledClientPath = path.resolve(
    __dirname,
    "../test-integration-client.js",
  );

  beforeAll(() => {
    // Create test schema
    fs.writeFileSync(
      smallSchemaPath,
      `
/**
 * Simple OpenAPI schema for testing
 */

export interface paths {
  '/pets': {
    /** List all pets */
    get: {
      parameters: {
        query?: {
          /** How many items to return at one time */
          limit?: number;
        };
      };
      responses: {
        /** A list of pets */
        200: {
          content: {
            'application/json': {
              schema: {
                type: 'array';
                items: components['schemas']['Pet'];
              };
            };
          };
        };
      };
    };
    /** Create a pet */
    post: operations["post-/pets"];
  };

  '/pets/{petId}': {
    /** Get a pet by ID */
    get: operations["get-/pets/{petId}"];
  };
}

export interface operations {
  "get-/pets/{petId}": {
    parameters: {
      path: {
        /** The ID of the pet to retrieve */
        petId: string;
      };
    };
    responses: {
      /** A single pet */
      200: {
        content: {
          'application/json': {
            schema: components['schemas']['Pet'];
          };
        };
      };
    };
  };
  "post-/pets": {
    requestBody: {
      content: {
        'application/json': {
          schema: components["schemas"]["NewPet"];
        };
      };
    };
    responses: {
      /** The newly created pet */
      201: {
        content: {
          'application/json': {
            schema: components['schemas']['Pet'];
          };
        };
      };
    };
  };
}

export interface components {
  schemas: {
    /** A pet object */
    Pet: {
      id: number;
      name: string;
      tag?: string;
    };
    /** A new pet to be created */
    NewPet: {
      name: string;
      tag?: string;
    };
  };
}`,
    );
  });

  afterAll(() => {
    // Clean up
    const filesToRemove = [
      smallSchemaPath,
      outputClientPath,
      compiledClientPath,
      compiledClientPath.replace(".js", ".d.ts"),
    ];

    for (const file of filesToRemove) {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
      }
    }
  });

  it("should generate a compilable TypeScript client", () => {
    // Generate client
    const clientCode = generateClient({
      schemaPath: smallSchemaPath,
      baseUrl: "https://api.example.com",
    });

    // Write client to file
    fs.writeFileSync(outputClientPath, clientCode);

    // Attempt to compile the client (this will throw if compilation fails)
    let compileOutput: string;
    try {
      compileOutput = execSync(
        `npx tsc ${outputClientPath} --esModuleInterop --target ES2020 --module CommonJS --moduleResolution node`,
        { encoding: "utf8" },
      );
    } catch (error) {
      console.error("Compilation error:", error.stdout);
      throw error;
    }

    // Check that compilation succeeded by verifying the output file exists
    expect(fs.existsSync(compiledClientPath)).toBe(true);
  });

  it("should generate client code that uses openapi-fetch correctly", () => {
    // Generate client
    const clientCode = generateClient({
      schemaPath: smallSchemaPath,
      baseUrl: "https://api.example.com",
    });

    // Verify the client code structure
    expect(clientCode).toContain(
      'import createClient, { ClientOptions } from "openapi-fetch"',
    );
    expect(clientCode).toContain("export class Client {");
    expect(clientCode).toContain("this.client = createClient<paths>(");

    // Check method generation
    expect(clientCode).toContain("async getPets(");
    expect(clientCode).toContain("async getPetsPetid(");
    expect(clientCode).toContain("async postPets(");

    // Check proper method implementation
    expect(clientCode).toContain('return await this.client.GET("/pets"');
    expect(clientCode).toContain(
      'return await this.client.GET("/pets/{petId}"',
    );
    expect(clientCode).toContain('return await this.client.POST("/pets"');

    // Check parameter handling
    expect(clientCode).toContain("params: {");
    expect(clientCode).toContain("path: {");
    expect(clientCode).toContain("petId:");
    expect(clientCode).toContain("query: {");
    expect(clientCode).toContain("limit?:");
    // Check for body param in POST method
    expect(clientCode).toContain("body:");
    expect(clientCode).toContain('POST("/pets"');
  });

  it("should generate correct JSDoc comments for methods", () => {
    // Generate client
    const clientCode = generateClient({
      schemaPath: smallSchemaPath,
      baseUrl: "https://api.example.com",
    });

    // Check JSDoc comments
    expect(clientCode).toContain("* List all pets");
    expect(clientCode).toContain("* Get a pet by ID");
    expect(clientCode).toContain("* Create a pet");

    // Check parameter JSDoc comments
    expect(clientCode).toContain("How many items to return at one time");
    expect(clientCode).toContain("The ID of the pet to retrieve");
  });
});
