# Build and Test WebIDE with a Local Csound WASM Build

This guide explains how to:

1. Build an updated local Csound WASM binary (`@csound/wasm-bin`)
2. Build an updated local Csound JS wrapper (`@csound/browser`)
3. Run `web-ide` against that local build in development

## One-command update

From `web-ide`, run:

```bash
npm run update-local-build
```

This command performs the full flow:

- build `csound/wasm`
- build `csound/wasm/browser` (using `nix-shell -p jdk` when available)
- sync into `web-ide/vendor/csound-browser`

Optional flags:

```bash
# skip dependency installs
npm run update-local-build -- --skip-install

# skip parts of the pipeline
npm run update-local-build -- --skip-wasm --skip-browser --skip-sync

# use a non-default csound repo location
CSOUND_ROOT=/absolute/path/to/csound npm run update-local-build
```

## Prerequisites

- macOS with:
    - `git`
    - `node` and `npm`
    - `yarn` (for `csound/wasm` and `csound/wasm/browser` workflows)
    - `nix` (required by the Csound WASM build scripts)
- Sibling checkouts like:
    - `/path/to/csound`
    - `/path/to/web-ide`

Example used below:

- `csound`: `../csound`
- `web-ide`: current directory

## Step 1: Build local Csound WASM binary (`@csound/wasm-bin`)

From the `csound` repo root:

```bash
cd wasm
yarn install
yarn build
```

What this does:

- Runs `wasm/scripts/compile.sh`
- Produces/updates:
    - `wasm/lib/csound.wasm`
    - `wasm/lib/csound.wasm.z`

Quick sanity check:

```bash
ls -lh lib/csound.wasm lib/csound.wasm.z
```

## Step 2: Build local Csound browser package (`@csound/browser`)

From `csound/wasm/browser`:

```bash
cd browser
yarn install
```

Link local `@csound/wasm-bin` so browser build uses your just-built WASM:

```bash
cd ../
yarn link
cd browser
yarn link @csound/wasm-bin
```

Build browser package:

```bash
yarn build
```

Expected output includes:

- `csound/wasm/browser/dist/csound.js`
- worker and inline assets under `csound/wasm/browser/dist/`

## Step 3: Sync local browser build into `web-ide/vendor`

From `web-ide`, copy your local `@csound/browser` build into a vendored path:

```bash
npm run sync:csound:local
```

This copies:

- `../csound/wasm/browser/dist/*` to `web-ide/vendor/csound-browser/dist/*`
- package metadata files needed by module resolution

Notes:

- Default source path is `../csound/wasm/browser`.
- To use a different source path:

```bash
CSOUND_BROWSER_SOURCE=/absolute/or/relative/path/to/csound/wasm/browser npm run sync:csound:local
```

- In development mode, Vite automatically aliases `@csound/browser` to `web-ide/vendor/csound-browser` when `vendor/csound-browser/dist/csound.js` exists.

## Step 4: Install and run WebIDE

From `web-ide`:

```bash
npm install
npm run start
```

Vite starts on `http://localhost:3000`.

## Step 5: Verify WebIDE is using your local build

1. Make a small local change in `csound/wasm/browser/src`.
2. Rebuild browser package:

```bash
cd ../csound/wasm/browser
yarn build
```

3. Restart WebIDE dev server.
4. Open WebIDE and run a simple Csound project.

If behavior matches your local change, the override works.

When you rebuild `csound/wasm/browser`, run sync again before restarting WebIDE:

```bash
npm run sync:csound:local
```

## Optional: Alternate workflow using `yarn link` in WebIDE

Linking can still work, but the vendored-copy approach above is more stable with Vite and avoids external path serving issues.

## Common issues

### `yarn build` fails in `csound/wasm`

- Ensure Nix is installed and working.
- Retry from clean state:

```bash
cd ../csound/wasm
rm -rf result result_plugin_c result_plugin_cpp
yarn build
```

### WebIDE still uses published `@csound/browser`

- Confirm `web-ide/vendor/csound-browser/dist/csound.js` exists.
- Run `npm run sync:csound:local` again.
- Stop and restart `npm run start`.

### Runtime errors after rebuilding Csound

- Rebuild in order:
    1. `csound/wasm` (`yarn build`)
    2. `csound/wasm/browser` (`yarn build`)
    3. restart `web-ide`

## Reset to normal (published package)

Remove the vendored folder and restart:

```bash
rm -rf vendor/csound-browser
npm run start
```
