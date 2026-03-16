import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const AVATAR_EXTS   = new Set([".jpg",".jpeg",".jfif",".png",".webp",".svg",".gif",".avif"]);
const AVATAR_FOLDERS = ["pro","against","neutral"];

/*
 * avatarManifestPlugin
 * ─────────────────────
 * Exposes `virtual:avatar-manifest` — an auto-generated JSON mapping of
 * folder → array of filenames, built by scanning public/avatars/ at build
 * time.  Any image format is picked up automatically; no manual manifest
 * to update when the researcher adds / removes files.
 *
 * In dev mode the avatar folders are watched; adding or removing a file
 * triggers a full page reload so the new list is reflected immediately.
 */
function avatarManifestPlugin() {
  const VIRTUAL_ID  = "virtual:avatar-manifest";
  const RESOLVED_ID = "\0" + VIRTUAL_ID;
  const avatarDir   = path.resolve(__dirname, "public/avatars");

  function buildManifest() {
    const out = {};
    for (const folder of AVATAR_FOLDERS) {
      const dir = path.join(avatarDir, folder);
      out[folder] = fs.existsSync(dir)
        ? fs.readdirSync(dir).filter(f => AVATAR_EXTS.has(path.extname(f).toLowerCase()))
        : [];
    }
    return out;
  }

  return {
    name: "avatar-manifest",
    resolveId(id) {
      if (id === VIRTUAL_ID) return RESOLVED_ID;
    },
    load(id) {
      if (id === RESOLVED_ID)
        return `export default ${JSON.stringify(buildManifest())};`;
    },
    configureServer(server) {
      server.watcher.add(avatarDir);
      server.watcher.on("all", (_, filePath) => {
        if (!filePath.startsWith(avatarDir)) return;
        const mod = server.moduleGraph.getModuleById(RESOLVED_ID);
        if (mod) server.moduleGraph.invalidateModule(mod);
        server.hot.send({ type: "full-reload" });
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), avatarManifestPlugin()],
  server: {
    port: 3000,
    proxy: {
      "/anthropic": {
        target: "https://api.anthropic.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/anthropic/, ""),
      },
    },
  },
});
