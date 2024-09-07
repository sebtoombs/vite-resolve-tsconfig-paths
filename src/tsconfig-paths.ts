import os from "node:os";
import path from "node:path";
import { normalizePath, searchForWorkspaceRoot } from "vite";
import { Plugin } from "vite";
import {
  parse,
  parseNative,
  findAll,
  TSConfckParseOptions,
  TSConfckCache,
  TSConfckParseResult,
  TSConfckParseNativeOptions,
} from "tsconfck";
import { createMatchPath, MatchPath } from "tsconfig-paths";

const isWindows = os.platform() == "win32";

export const resolve = isWindows
  ? (...paths: string[]) => normalizePath(path.win32.resolve(...paths))
  : path.posix.resolve;

export const isAbsolute = isWindows
  ? path.win32.isAbsolute
  : path.posix.isAbsolute;

const relativeImportRE = /^\.\.?(\/|$)/;

type ProjectParseResult = Omit<TSConfckParseResult, "tsconfig"> & {
  tsconfig: unknown;
};

function createResolver(matchPath: MatchPath) {
  return async (
    id: string,
    _importer: string | undefined,
    extensions: string[] = [".ts", ".tsx"]
  ) => {
    return matchPath(id, undefined, undefined, extensions);
  };
}

type Resolver = ReturnType<typeof createResolver>;

const parseOptions: TSConfckParseOptions = {
  cache: new TSConfckCache(),
};

const nativeParseOptions: TSConfckParseNativeOptions = {
  cache: new TSConfckCache(),
};

async function processProject(
  project: ProjectParseResult,
  projectRoot?: string
): Promise<Resolver | null | (Resolver | null)[]> {
  if (!projectRoot) {
    projectRoot = path.dirname(project.tsconfigFile);
  }

  // TODO - the original vite-tsconfig-paths plugin does this, but I think a project with references can also have compilerOptions
  if (project.referenced) {
    const resolvers = await Promise.all(
      project.referenced.map(
        async (referenced) => await processProject(referenced, projectRoot)
      )
    );

    return resolvers.flat(Infinity) as (Resolver | null)[];
  }

  const parsedProject = await parseNative(
    project.tsconfigFile,
    nativeParseOptions
  );

  const baseUrl = parsedProject.result.options.baseUrl;
  const paths = parsedProject.result.options.paths;

  if (typeof paths !== "object" || !paths) {
    return null;
  }

  const absoluteBaseUrl = resolve(projectRoot, baseUrl);

  const matchPath = createMatchPath(absoluteBaseUrl, paths, undefined, false);

  const resolver = createResolver(matchPath);
  return resolver;
}

async function processProjects(
  projects: ProjectParseResult[]
): Promise<Resolver[]> {
  const resolvers = await Promise.all(
    projects.map(async (project) => await processProject(project))
  );

  return resolvers.flat(Infinity).filter(Boolean) as Resolver[];
}

export function tsconfigPaths(): Plugin {
  let resolvers: ReturnType<typeof createResolver>[] = [];
  return {
    name: "tsconfig-paths",
    async configResolved(config) {
      const projectRoot = config.root;

      const workspaceRoot = searchForWorkspaceRoot(projectRoot);

      const projectFiles = await findAll(workspaceRoot, {
        skip(directory) {
          return directory == "node_modules" || directory == ".git";
        },
      });

      const parsedProjects = (await Promise.all(
        projectFiles.map((projectFile) => parse(projectFile, parseOptions))
      )) as ProjectParseResult[];

      resolvers = await processProjects(parsedProjects);
    },
    async resolveId(id, importer) {
      if (importer && !relativeImportRE.test(id) && !isAbsolute(id)) {
        for (const resolver of resolvers) {
          const resolved = await resolver(id, importer);
          if (resolved) {
            const result = await this.resolve(resolved, importer, {
              skipSelf: true,
            });
            if (result) {
              return result.id;
            }
          }
        }
      }
      return null;
    },
  };
}
