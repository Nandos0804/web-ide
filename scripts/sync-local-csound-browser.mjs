import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const sourceInput =
    process.env.CSOUND_BROWSER_SOURCE || "../csound/wasm/browser";
const sourcePath = path.resolve(projectRoot, sourceInput);
const targetPath = path.resolve(projectRoot, "vendor/csound-browser");

const assertExists = (filePath, name) => {
    if (!fs.existsSync(filePath)) {
        throw new Error(`Missing ${name}: ${filePath}`);
    }
};

assertExists(sourcePath, "source directory");
assertExists(path.join(sourcePath, "dist/csound.js"), "dist/csound.js");
assertExists(path.join(sourcePath, "package.json"), "package.json");

fs.rmSync(targetPath, { recursive: true, force: true });
fs.mkdirSync(targetPath, { recursive: true });

fs.cpSync(path.join(sourcePath, "dist"), path.join(targetPath, "dist"), {
    recursive: true
});

const vendoredCsoundJs = path.join(targetPath, "dist", "csound.js");
const knownBadSymbol = "libcsoundEntry$$module$src$libcsound_entry";
const knownGoodSymbol = "$jscompDefaultExport$$module$src$libcsound_entry";

if (fs.existsSync(vendoredCsoundJs)) {
    const jsContents = fs.readFileSync(vendoredCsoundJs, "utf8");
    if (jsContents.includes(knownBadSymbol)) {
        fs.writeFileSync(
            vendoredCsoundJs,
            jsContents.replaceAll(knownBadSymbol, knownGoodSymbol),
            "utf8"
        );
        console.log("Applied local fix for generated libcsound export symbol");
    }
}

for (const filename of [
    "package.json",
    "index.d.ts",
    "LICENSE",
    "THIRD_PARTY.md"
]) {
    const from = path.join(sourcePath, filename);
    if (fs.existsSync(from)) {
        fs.copyFileSync(from, path.join(targetPath, filename));
    }
}

console.log(`Synced local @csound/browser from ${sourcePath}`);
console.log(`Vendored copy created at ${targetPath}`);
