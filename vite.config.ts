import path from "node:path";
import fs from "node:fs";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import viteTsconfigPaths from "vite-tsconfig-paths";
import svgr from "vite-plugin-svgr";
import checker from "vite-plugin-checker";

export default defineConfig(({ mode }) => {
    const vendoredCsoundBrowserPath = path.resolve(
        process.cwd(),
        "vendor/csound-browser"
    );
    const useVendoredCsoundBrowser =
        mode !== "production" &&
        fs.existsSync(path.join(vendoredCsoundBrowserPath, "dist/csound.js"));

    return {
        define: {
            "process.env.REACT_APP_DATABASE": JSON.stringify(
                process.env.REACT_APP_DATABASE
            )
        },
        // depending on your application, base can also be "/"
        base: "/",
        resolve: {
            alias: useVendoredCsoundBrowser
                ? {
                      "@csound/browser": vendoredCsoundBrowserPath
                  }
                : undefined
        },
        plugins: [
            checker({
                // e.g. use TypeScript check
                typescript: true
            }),
            react({
                jsxImportSource: "@emotion/react",
                babel: {
                    plugins: ["@emotion/babel-plugin"]
                }
            }),
            viteTsconfigPaths(),
            svgr()
            // viteRawPlugin({
            //     fileRegex: /\.csd|\.orc\.sco\.udo$/
            // })
        ],
        server: {
            // this ensures that the browser opens upon server start
            open: true,
            // this sets a default port to 3000
            port: 3000
        },
        test: {
            environment: "jsdom",
            include: ["src/**/*.test.{ts,tsx}"]
        }
    };
});
