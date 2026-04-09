import { defineConfig } from 'vite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function buildInfoPlugin() {
  function generate() {
    const buildTime = new Date().toISOString();
    let dataUpdated = buildTime;
    try {
      const metaPath = path.resolve(__dirname, '../data/metadata.json');
      dataUpdated = fs.statSync(metaPath).mtime.toISOString();
    } catch { /* fall back to build time */ }
    return `export const BUILD_TIME = ${JSON.stringify(buildTime)};\nexport const DATA_UPDATED = ${JSON.stringify(dataUpdated)};\n`;
  }

  return {
    name: 'build-info',
    buildStart() {
      fs.writeFileSync(path.resolve(__dirname, 'build-info.js'), generate());
    },
  };
}

export default defineConfig({
  plugins: [buildInfoPlugin()],
  server: {
    host: true,
  },
});
