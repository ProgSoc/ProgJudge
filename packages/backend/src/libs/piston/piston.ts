import { z } from "zod";

/** The Config Schema */
const PistonClientSchema = z.object({
  url: z.string().url("Needs to be a valid url"),
});

/** The type for the client config */
export type PistonClientConfig = z.infer<typeof PistonClientSchema>;

/** The Piston runtime schema */
const PistonRuntimeSchema = z.object({
  language: z.string(),
  version: z.string(),
  aliases: z.array(z.string()),
  runtime: z.string().optional(),
});

/** The type for a Piston Runtime */
export type PistonRuntime = z.infer<typeof PistonRuntimeSchema>;

/** The piston file type schema */
const PistonFileSchema = z.object({
  name: z.string().optional(),
  content: z.string(),
  encoding: z.string().optional(),
});

/** The type of the piston file input */
export type PistonFile = z.infer<typeof PistonFileSchema>;

/** The set of params for execution */
const PistonExectuteParamsSchema = z.object({
  /** Version */
  version: z.string(),
  /** Language */
  language: z.string(),
  /** Files */
  files: z.array(PistonFileSchema),
  /** Stdin */
  stdin: z.string().optional(),
  /** Args */
  args: z.array(z.string()).optional(),
  /** Run timeout */
  runTimeout: z.number().optional(),
  /** Compile timeout */
  compileTimeout: z.number().optional(),
  /** Compile memory limit */
  compileMemoryLimit: z.number().optional(),
  /** Run memory limit */
  runMemoryLimit: z.number().optional(),
});

/** The set of params for execution */
export type PistonExecuteParams = z.infer<typeof PistonExectuteParamsSchema>;

/** The Response Schema for the result of a process (either compile or run) */
const PistonResultRunSchema = z.object({
  /** The Stdout of the process */
  stdout: z.string(),
  /** The Stderr of the process */
  stderr: z.string(),
  /** The exit code of the process */
  code: z.number().nullable(),
  /** The signal of the process */
  signal: z.string().nullable(),
  /** The output of the process */
  output: z.string(),
});

/** The Response Schema for the result of compilation or run */
export type PistonResultRun = z.infer<typeof PistonResultRunSchema>;

/** The result of an execution job */
const PistonExecuteResultSchema = z.object({
  /** The language that was run */
  language: z.string(),
  /** The exact version that was used to run your code */
  version: z.string(),
  /** The output of running the program */
  run: PistonResultRunSchema,
  /** The output of compiling the program (doesn't apply to all languages) */
  compile: PistonResultRunSchema.optional(), // Some languages don't need to be compiled e.g. Python
});

/** The Piston error schema */
const ErrorResultSchema = z.object(({
  message: z.string(),
}))

/** The Piston error type */
type ErrorResult = z.infer<typeof ErrorResultSchema>;

/** The return type for a code execution job */
export type PistonExecuteResult = z.infer<typeof PistonExecuteResultSchema>;

/** The schema for a single package when getting a list of packages */
const PistonPackageResultSchema = z.object({
  language: z.string(),
  language_version: z.string(),
  installed: z.boolean(),
});

/** The schema for a single package */
export type PistonPackageResult = z.infer<typeof PistonPackageResultSchema>;

/** The schema for a list of packages */
const PistonPackagesSchema = z.array(PistonPackageResultSchema);

/** The type for a list of packages */
export type PistonPackages = z.infer<typeof PistonPackagesSchema>;

/** The schema for a single package when installing or uninstalling a package */
const PistonPackageSchema = z.object({
  language: z.string(),
  version: z.string(),
});

/** The type of a single package for uninstalling or installing a package */
export type PistonPackage = z.infer<typeof PistonPackageSchema>;

const isErrorResult = (result: any | ErrorResult): result is ErrorResult => {
  return result.hasOwnProperty("message");
}

/**
 * The Piston Client, for interacting with the Piston API.
 */
export class PistonClient {
  private config: PistonClientConfig;

  constructor(rawConfig: PistonClientConfig) {
    this.config = PistonClientSchema.parse(rawConfig);
  }

  /**
   * Returns a list of available languages, including the version, runtime and aliases.
   */
  async getRuntimes(): Promise<Array<PistonRuntime>> {
    const runtimesRequest = await fetch(`${this.config.url}/api/v2/runtimes`);
    const runtimesRaw = await runtimesRequest.json();
    const runtimes = PistonRuntimeSchema.array().parse(runtimesRaw);
    return runtimes;
  }

  /**
   * Executes a code snippet using the Piston API.
   * @param rawParams The params for the execution, including file content, language, version, etc.
   * @throws {Error} If the piston API returns an error.
   * @returns The result of the execution.
   */
  async execute(rawParams: PistonExecuteParams): Promise<PistonExecuteResult> {
    const {
      language,
      version,
      files,
      stdin,
      args,
      runTimeout,
      runMemoryLimit,
      compileMemoryLimit,
      compileTimeout,
    } = PistonExectuteParamsSchema.parse(rawParams);

    const executionRequest = await fetch(`${this.config.url}/api/v2/execute`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        language,
        version,
        files,
        stdin,
        args,
        run_timeout: runTimeout,
        compile_timeout: compileTimeout,
        compile_memory_limit: compileMemoryLimit,
        run_memory_limit: runMemoryLimit,
      }),
    });

    const executionRaw = await executionRequest.json();

    const execution = z.union([
      PistonExecuteResultSchema,
      ErrorResultSchema,
    ]).parse(executionRaw);

    if (isErrorResult(execution)) {
      throw new Error(execution.message);
    }

    return execution;
  }

  /**
   * Get a list of available packages
   * @returns A list of packages
   */
  async getPackages(): Promise<Array<PistonPackageResult>> {
    const packagesRequest = await fetch(`${this.config.url}/api/v2/packages`);
    const packagesRaw = await packagesRequest.json();
    const packages = PistonPackagesSchema.parse(packagesRaw);
    return packages;
  }

  /**
   * Installs a package
   * @param rawParams The params for installing a package
   * @throws {Error} If the package could not be installed
   * @returns The package that was installed
   */
  async installPackage(
    rawParams: PistonPackage
  ): Promise<PistonPackage> {
    const { language, version } = PistonPackageSchema.parse(rawParams);

    const installRequest = await fetch(`${this.config.url}/api/v2/packages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        language,
        version,
      }),
    });

    const installRaw = await installRequest.json();

    const install = z.union([
      PistonPackageSchema,
      ErrorResultSchema,
    ]).parse(installRaw);

    if (isErrorResult(install)) {
      throw new Error(install.message);
    }

    return install;
  }

  /**
   * Uninstalls a package
   * @param rawParams The params for uninstalling a package
   * @throws {Error} If the package could not be uninstalled
   * @returns The package that was uninstalled
   */
  async uninstallPackage(
    rawParams: PistonPackage
  ): Promise<PistonPackage> {
    const { language, version } = PistonPackageSchema.parse(rawParams);

    const uninstallRequest = await fetch(`${this.config.url}/api/v2/packages`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        language,
        version,
      }),
    });

    const uninstallRaw = await uninstallRequest.json();

    const uninstall = z.union([
      PistonPackageSchema,
      ErrorResultSchema,
    ]).parse(uninstallRaw);

    if (isErrorResult(uninstall)) {
      throw new Error(uninstall.message);
    }

    return uninstall;
  }
}
