import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webIdeRoot = path.resolve(__dirname, "..");
const csoundRoot = path.resolve(
    webIdeRoot,
    process.env.CSOUND_ROOT || "../csound"
);
const wasmRoot = path.join(csoundRoot, "wasm");
const browserRoot = path.join(wasmRoot, "browser");

const args = new Set(process.argv.slice(2));
const skipInstall = args.has("--skip-install");
const skipLink = args.has("--skip-link");
const skipWasm = args.has("--skip-wasm");
const skipBrowser = args.has("--skip-browser");
const skipSync = args.has("--skip-sync");

const run = ({ command, commandArgs, cwd, env, label }) => {
    console.log(`\n==> ${label}`);
    const result = spawnSync(command, commandArgs, {
        cwd,
        env: { ...process.env, ...env },
        stdio: "inherit"
    });
    if (result.status !== 0) {
        throw new Error(`Step failed: ${label}`);
    }
};

const hasCommand = (command) => {
    const result = spawnSync("which", [command], { stdio: "ignore" });
    return result.status === 0;
};

const ensurePaths = () => {
    const checks = [
        { p: csoundRoot, label: "csound repo" },
        { p: wasmRoot, label: "csound/wasm" },
        { p: browserRoot, label: "csound/wasm/browser" }
    ];

    for (const check of checks) {
        run({
            command: "test",
            commandArgs: ["-d", check.p],
            cwd: webIdeRoot,
            label: `Validate ${check.label}: ${check.p}`
        });
    }
};

const buildWasm = () => {
    if (skipWasm) {
        console.log("\n==> Skipping wasm build (--skip-wasm)");
        return;
    }

    if (!skipInstall) {
        run({
            command: "yarn",
            commandArgs: ["install"],
            cwd: wasmRoot,
            label: "Install csound/wasm dependencies"
        });
    }

    run({
        command: "yarn",
        commandArgs: ["build"],
        cwd: wasmRoot,
        label: "Build csound/wasm"
    });
};

const buildBrowser = () => {
    if (skipBrowser) {
        console.log("\n==> Skipping browser build (--skip-browser)");
        return;
    }

    if (!skipInstall) {
        run({
            command: "yarn",
            commandArgs: ["install"],
            cwd: browserRoot,
            label: "Install csound/wasm/browser dependencies"
        });
    }

    if (!skipLink) {
        run({
            command: "yarn",
            commandArgs: ["link"],
            cwd: wasmRoot,
            label: "Link local @csound/wasm-bin"
        });

        run({
            command: "yarn",
            commandArgs: ["link", "@csound/wasm-bin"],
            cwd: browserRoot,
            label: "Use linked @csound/wasm-bin in browser package"
        });
    }

    if (hasCommand("nix-shell")) {
        run({
            command: "nix-shell",
            commandArgs: ["-p", "jdk", "--run", "yarn build:prod"],
            cwd: browserRoot,
            label: "Build csound/wasm/browser (production) with nix-shell JDK"
        });
    } else {
        run({
            command: "yarn",
            commandArgs: ["build:prod"],
            cwd: browserRoot,
            label: "Build csound/wasm/browser (production)"
        });
    }
};

const syncToWebIde = () => {
    if (skipSync) {
        console.log("\n==> Skipping vendor sync (--skip-sync)");
        return;
    }

    run({
        command: "node",
        commandArgs: ["scripts/sync-local-csound-browser.mjs"],
        cwd: webIdeRoot,
        env: { CSOUND_BROWSER_SOURCE: browserRoot },
        label: "Sync local browser build into web-ide/vendor"
    });
};

try {
    ensurePaths();
    buildWasm();
    buildBrowser();
    syncToWebIde();
    console.log(
        "\nDone: local Csound WASM/browser build updated and synced to web-ide/vendor."
    );
} catch (error) {
    console.error(`\nupdate-local-build failed: ${error.message}`);
    process.exit(1);
}
