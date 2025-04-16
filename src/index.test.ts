import fs from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type GenerateClientOptions, generateClient } from "./index";

describe("generateClient", () => {
  const smallSchemaPath = path.resolve(
    __dirname,
    "../examples/small-schema.d.ts",
  );

  beforeEach(() => {
    // Create a test schema if it doesn't exist
    if (!fs.existsSync(smallSchemaPath)) {
      const examplesDir = path.dirname(smallSchemaPath);
      if (!fs.existsSync(examplesDir)) {
        fs.mkdirSync(examplesDir, { recursive: true });
      }

      const testSchema = `
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
}`;
      fs.writeFileSync(smallSchemaPath, testSchema);
    }
  });

  it("should generate client code from schema", () => {
    const options: GenerateClientOptions = {
      schemaPath: smallSchemaPath,
      baseUrl: "https://api.example.com",
    };

    const result = generateClient(options);

    // Basic assertions
    expect(result).toBeTypeOf("string");
    expect(result).toContain("import createClient");
    expect(result).toContain("export class Client");
    expect(result).toContain("constructor(clientOptions?: ClientOptions)");

    // Check for generated endpoints
    expect(result).toContain("async getPets(");
    expect(result).toContain("async getPetsPetid(");
    expect(result).toContain("async postPets(");

    // Check for JSDoc comments
    expect(result).toContain("* List all pets");
    expect(result).toContain("* Get a pet by ID");
    expect(result).toContain("* Create a pet");

    // Check for proper parameter handling
    expect(result).toContain("params: {");
    expect(result).toContain("path: {");
    expect(result).toContain("query: {");
    expect(result).toContain("body:");
  });

  it("should use custom type names when provided", () => {
    // Create a custom schema file
    const customSchemaPath = path.resolve(
      __dirname,
      "../test-custom-schema.d.ts",
    );

    try {
      // Write a schema with the custom interface names
      fs.writeFileSync(
        customSchemaPath,
        `
export interface MyCustomPaths {
  '/test': {
    get: {
      responses: {
        200: {
          content: {
            'application/json': {
              schema: MyCustomComponents['schemas']['Test'];
            };
          };
        };
      };
    };
  };
}

export interface MyCustomComponents {
  schemas: {
    Test: {
      id: number;
      name: string;
    };
  };
}

export interface MyCustomOperations {}
`,
      );

      const options: GenerateClientOptions = {
        schemaPath: customSchemaPath,
        pathsTypeName: "MyCustomPaths",
        componentsTypeName: "MyCustomComponents",
        operationsTypeName: "MyCustomOperations",
        baseUrl: "https://custom.example.com/",
      };

      const result = generateClient(options);

      // Check that our custom type names are used in the imports
      expect(result).toContain(
        "import type { MyCustomComponents, MyCustomPaths, MyCustomOperations }",
      );
      expect(result).toContain('baseUrl: "https://custom.example.com/"');
    } finally {
      // Clean up
      if (fs.existsSync(customSchemaPath)) {
        fs.unlinkSync(customSchemaPath);
      }
    }
  });

  it("should throw error when schema file does not exist", () => {
    const options: GenerateClientOptions = {
      schemaPath: "/path/to/nonexistent/schema.d.ts",
    };

    expect(() => generateClient(options)).toThrow();
  });

  it("should throw error when paths interface is not found", () => {
    // Create a temporary schema without paths interface
    const tempSchemaPath = path.resolve(
      __dirname,
      "../test-invalid-schema.d.ts",
    );

    try {
      fs.writeFileSync(
        tempSchemaPath,
        `
export interface components {
  schemas: {
    Pet: {
      id: number;
      name: string;
    };
  };
}`,
      );

      const options: GenerateClientOptions = {
        schemaPath: tempSchemaPath,
      };

      expect(() => generateClient(options)).toThrow(
        /Interface paths not found/,
      );
    } finally {
      // Clean up
      if (fs.existsSync(tempSchemaPath)) {
        fs.unlinkSync(tempSchemaPath);
      }
    }
  });

  it("should use default values when optional parameters not provided", () => {
    const options: GenerateClientOptions = {
      schemaPath: smallSchemaPath,
    };

    const result = generateClient(options);

    expect(result).toContain("import type { components, paths, operations }");
    expect(result).toContain('baseUrl: "https://example.com/"');
  });
});

describe("Client method generation", () => {
  it("should include proper parameter handling for different parameter types", () => {
    // Define the schema path
    const testSchemaPath = path.resolve(
      __dirname,
      "../examples/small-schema.d.ts",
    );

    const options: GenerateClientOptions = {
      schemaPath: testSchemaPath,
    };

    const result = generateClient(options);

    // Test path parameters
    expect(result).toContain("petId:");

    // Test query parameters
    expect(result).toContain("limit?:");

    // Test request body - since the exact format may change based on the schema's structure
    // we'll test for the presence of body parameter instead of exact format
    expect(result).toContain("body:");
  });

  it("should handle complex path operations and sanitize correctly", () => {
    // Create a schema with complex paths
    const complexPathSchemaPath = path.resolve(
      __dirname,
      "../test-complex-paths.d.ts",
    );

    try {
      fs.writeFileSync(
        complexPathSchemaPath,
        `
export interface paths {
  '/api/v1/complex-path/{id}/nested/{nestedId}': {
    get: {
      parameters: {
        path: {
          /** The main ID */
          id: string;
          /** The nested ID */
          nestedId: string;
        };
        query: {
          /** Filter result by status */
          status?: string;
        };
      };
      responses: {
        200: {
          content: {
            'application/json': {
              schema: components['schemas']['ComplexResult'];
            };
          };
        };
      };
    };
  };
  
  '/api/v2/items-with-dashes': {
    post: {
      requestBody: {
        content: {
          'application/json': {
            schema: components['schemas']['ItemInput'];
          };
        };
      };
      responses: {
        201: {
          content: {
            'application/json': {
              schema: components['schemas']['Item'];
            };
          };
        };
      };
    };
  };
}

export interface components {
  schemas: {
    ComplexResult: {
      id: string;
      data: string;
    };
    ItemInput: {
      name: string;
    };
    Item: {
      id: string;
      name: string;
    };
  };
}

export interface operations {}
`,
      );

      const options: GenerateClientOptions = {
        schemaPath: complexPathSchemaPath,
      };

      const result = generateClient(options);

      // Check that complex paths are sanitized correctly
      expect(result).toContain("async getApiV1ComplexPathIdNestedNestedid(");
      expect(result).toContain("async postApiV2ItemsWithDashes(");

      // Make sure path parameters are correctly included
      expect(result).toContain("id: string");
      expect(result).toContain("nestedId: string");

      // Verify the path is preserved correctly in the method call
      expect(result).toContain(
        'return await this.client.GET("/api/v1/complex-path/{id}/nested/{nestedId}"',
      );
      expect(result).toContain(
        'return await this.client.POST("/api/v2/items-with-dashes"',
      );
    } finally {
      // Clean up
      if (fs.existsSync(complexPathSchemaPath)) {
        fs.unlinkSync(complexPathSchemaPath);
      }
    }
  });

  it("should preserve JSDoc comments from parameters", () => {
    // Create a schema with JSDoc comments
    const jsdocSchemaPath = path.resolve(__dirname, "../test-jsdoc.d.ts");

    try {
      fs.writeFileSync(
        jsdocSchemaPath,
        `
export interface paths {
  '/users': {
    /** Search for users with specified criteria */
    get: {
      parameters: {
        query: {
          /** The search term to filter users */
          query?: string;
          /** Maximum number of results to return */
          limit?: number;
          /** Sort field - can be 'name', 'createdAt', etc. */
          sort?: string;
        };
      };
      responses: {
        /** Successfully retrieved users */
        200: {
          content: {
            'application/json': {
              schema: {
                type: 'array';
                items: components['schemas']['User'];
              };
            };
          };
        };
      };
    };
  };
}

export interface components {
  schemas: {
    /** User model */
    User: {
      /** Unique user identifier */
      id: number;
      /** User's display name */
      name: string;
      /** User's email address */
      email: string;
    };
  };
}

export interface operations {}
`,
      );

      const options: GenerateClientOptions = {
        schemaPath: jsdocSchemaPath,
      };

      const result = generateClient(options);

      // Check that JSDoc comments are preserved
      expect(result).toContain("* Search for users with specified criteria");
      expect(result).toContain("* The search term to filter users");
      expect(result).toContain("* Maximum number of results to return");
      expect(result).toContain("* Sort field - can be");
    } finally {
      // Clean up
      if (fs.existsSync(jsdocSchemaPath)) {
        fs.unlinkSync(jsdocSchemaPath);
      }
    }
  });

  it("should handle header parameters correctly", () => {
    // Create a schema with header parameters
    const headerSchemaPath = path.resolve(__dirname, "../test-headers.d.ts");

    try {
      fs.writeFileSync(
        headerSchemaPath,
        `
export interface paths {
  '/api/secure-resource': {
    get: {
      parameters: {
        header: {
          /** Authorization token */
          'Authorization': string;
          /** API version */
          'X-API-Version'?: string;
          /** Request ID for tracing */
          'X-Request-ID'?: string;
        };
      };
      responses: {
        200: {
          content: {
            'application/json': {
              schema: components['schemas']['SecureResource'];
            };
          };
        };
      };
    };
  };
}

export interface components {
  schemas: {
    SecureResource: {
      id: string;
      data: string;
    };
  };
}

export interface operations {}
`,
      );

      const options: GenerateClientOptions = {
        schemaPath: headerSchemaPath,
      };

      const result = generateClient(options);

      // Check that header parameters are correctly included
      expect(result).toContain("header: {");
      expect(result).toContain('"Authorization"');
      expect(result).toContain('"X-API-Version"?:');
      expect(result).toContain('"X-Request-ID"?:');
      expect(result).toContain("* Authorization token");
      expect(result).toContain("* API version");
      expect(result).toContain("* Request ID for tracing");
    } finally {
      // Clean up
      if (fs.existsSync(headerSchemaPath)) {
        fs.unlinkSync(headerSchemaPath);
      }
    }
  });

  it("should handle fallbacks for parameter extraction errors", () => {
    // Create a schema with potentially problematic types
    const fallbackSchemaPath = path.resolve(
      __dirname,
      "../test-fallbacks.d.ts",
    );

    try {
      // This schema has some intentional issues to test fallback mechanisms
      fs.writeFileSync(
        fallbackSchemaPath,
        `
export interface paths {
  '/api/fallback-test': {
    get: {
      parameters: {
        query: Record<string, unknown>;  // Use a type reference that might be hard to extract
        path: {
          id: string;
        };
      };
      responses: {
        200: unknown;
      };
    };
    post: {
      requestBody: {
        content: {
          'application/json': unknown;  // Another hard-to-extract type
        };
      };
      responses: {
        201: unknown;
      };
    };
  };
}

export interface components {
  schemas: {
    TestSchema: {
      id: string;
    };
  };
}

export interface operations {}
`,
      );

      const options: GenerateClientOptions = {
        schemaPath: fallbackSchemaPath,
      };

      const result = generateClient(options);

      // Check that the client still generates despite the complex types
      expect(result).toContain("async getApiFallbackTest(");
      expect(result).toContain("async postApiFallbackTest(");

      // The client should generate even with the awkward types
      // We can't guarantee the exact fallback format, so let's check that it contains
      // the path parameter properly
      expect(result).toContain("id: string");
    } finally {
      // Clean up
      if (fs.existsSync(fallbackSchemaPath)) {
        fs.unlinkSync(fallbackSchemaPath);
      }
    }
  });

  it("should handle different request body formats", () => {
    // Create a schema with different request body formats
    const bodySchemaPath = path.resolve(
      __dirname,
      "../test-request-bodies.d.ts",
    );

    try {
      fs.writeFileSync(
        bodySchemaPath,
        `
export interface paths {
  '/api/users': {
    // Define endpoint that references a component schema
    post: {
      requestBody: {
        content: {
          'application/json': {
            schema: components['schemas']['UserInput'];
          };
        };
      };
      responses: {
        201: {
          content: {
            'application/json': {
              schema: components['schemas']['User'];
            };
          };
        };
      };
    };
    
    // Define endpoint that references operation
    put: operations['put-/api/users'];
  };
}

export interface components {
  schemas: {
    UserInput: {
      name: string;
      email: string;
    };
    User: {
      id: number;
      name: string;
      email: string;
    };
  };
}

export interface operations {
  'put-/api/users': {
    requestBody: {
      content: {
        'application/json': {
          schema: {
            id: number;
            name?: string;
            email?: string;
          };
        };
      };
    };
    responses: {
      200: {
        content: {
          'application/json': {
            schema: components['schemas']['User'];
          };
        };
      };
    };
  };
}
`,
      );

      const options: GenerateClientOptions = {
        schemaPath: bodySchemaPath,
      };

      const result = generateClient(options);

      // Check that both body formats are processed correctly
      expect(result).toContain("async postApiUsers(");
      expect(result).toContain("async putApiUsers(");

      // Just check that the body parameter is present in both methods
      expect(result).toContain("body:");
      expect(result).toContain('PUT("/api/users"');
      expect(result).toContain('POST("/api/users"');
    } finally {
      // Clean up
      if (fs.existsSync(bodySchemaPath)) {
        fs.unlinkSync(bodySchemaPath);
      }
    }
  });
});
