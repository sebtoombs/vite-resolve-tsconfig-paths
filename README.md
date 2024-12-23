# vite-resolve-tsconfig-paths

[![npm](https://img.shields.io/badge/npm-CB3837?logo=npm&logoColor=fff)](https://www.npmjs.com/package/vite-resolve-tsconfig-paths)
[<img src="https://img.shields.io/npm/last-update/vite-resolve-tsconfig-paths"/>](https://www.npmjs.com/package/vite-resolve-tsconfig-paths)

Resolve Typescript paths (tsconfig paths) in your Vite project.

## Usage

Install

```bash
npm install -D vite-resolve-tsconfig-paths
```

Add to `vite.config.js`

```js
// vite.config.js
import { defineConfig } from "vite";
import { tsConfigPaths } from "vite-resolve-tsconfig-paths";

export default defineConfig({
  plugins: [tsConfigPaths()],
});
```

## Options

Currently none. Some coming soon.

## FAQ

#### Why this plugin?

Why use this plugin when there are several alternatives (I know, I struggled to find an available npm package name), and some are far more used, more mature? Great question. You don't have to!
I created this plugin to solve a problem I had; the main existing option doesn't support `extends` or `references` in a sub-directory. I did actually draft a fix for that library, but in my travels I decided that there was probably a "better" approach to solving the problem.
So this library was born.

#### Does it support references or extends in a sub-folder?

Yes. That was the main reason I created it.

#### Does it support `${configDir}`?

In theory yes. I haven't tested it yet. Test it, let me know.

## How it works

When the Vite plugin hook `configResolved` is run, the plugin (using `tsconfck`) looks for all `tsconfig.json` project files within the project root.

The plugin will then process all these `tsconfig.json` files (including `references`), and parse the config.

Parsing the config file gives the final `compilerOptions`, including values from extended configs.

The parsing uses `tsconfck`'s `parseNative`, so the result should be as comparable with the expected result as that library is capable of.

For each parsed result with `paths` in `compilerOptions`, the plugin will create a "resolver" function. This resolver function takes a Vite request id and attempts to resolve it relative to the `baseUrl` using `tsconfig-paths`.

In the Vite `resolveId` hook, the plugin checks each request, to see if the resolvers should be applied.

If there is an importer, the request id is not relative, and the request is not a file system absolute path (i.e. it is an alias import), the plugin applies all the resolvers created earlier until one matches.

## Prior art

This plugin was inspired by, and borrows some logic (checking request ids to see if resolvers should be applied) from **vite-tsconfig-paths** ([https://github.com/aleclarson/vite-tsconfig-paths](vite-tsconfig-paths)), however we've taken a significantly different approach to solving the problem.

## Contributing

Contributions are super welcome.

### Developing

Clone the repo

```bash
git clone https://github.com/sebtoombs/vite-resolve-tsconfig-paths.git
```

Install dependencies

```bash
npm install
```

Write some code!

Build

```bash
npm run build
```

Don't forget, to pass CI, your code will need to pass `npm run lint`, `npm run format:check` & `npm run build`

### Share your contribution

To make a contribution;

- Fork this repo
- Create a branch for your change, branch naming is not important
- Open a Pull Request against the `main` branch of this repo
  - PR title, labels etc are (at this stage) not important
- Wait for a review
- If approved, squash and merge
- Your change will be included in the next release!

## Support

<a href='https://ko-fi.com/C1C21326AG' target='_blank'><img height='36' style='border:0px;height:36px;' src='https://storage.ko-fi.com/cdn/kofi4.png?v=6' border='0' alt='Buy Me a Coffee at ko-fi.com' /></a>
