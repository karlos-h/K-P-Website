import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const SITE = "https://kavapyramids.com";

// Per-route <head> for crawlers and link-preview scrapers, which read the raw
// HTML and don't wait for the SPA to render. Each route is written to
// dist/<route>.html, which Netlify serves at /<route> ahead of the SPA fallback
// in netlify.toml. The homepage keeps index.html as-is. Keep in sync with
// public/sitemap.xml.
const ROUTE_META = {
  "media-hub": {
    title: "Event Photos | Kava & Pyramids",
    description: "Browse photos from Kava & Pyramids club nights, festivals and parties in New Zealand and overseas.",
  },
  epk: {
    title: "Kava & Pyramids Press Kit (EPK) | Hip Hop & R&B DJs",
    description: "Kava & Pyramids electronic press kit for promoters and media: bio, genres, gig history and booking contact for the Christchurch hip hop, R&B & global sounds DJ duo.",
  },
  "privacy-policy": {
    title: "Privacy Policy | Kava & Pyramids",
    description: "How Kava & Pyramids collects, uses and protects your personal information.",
  },
};

function staticRouteMeta() {
  let outDir;
  return {
    name: "static-route-meta",
    apply: "build",
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir);
    },
    closeBundle() {
      const html = readFileSync(resolve(outDir, "index.html"), "utf8");
      for (const [route, { title, description }] of Object.entries(ROUTE_META)) {
        const url = `${SITE}/${route}`;
        const out = html
          .replace(/<title>.*<\/title>/, `<title>${title}</title>`)
          .replace(/(<meta (?:property="og:title"|name="twitter:title") content=")[^"]*/g, (_, tag) => tag + title)
          .replace(/(<meta (?:name="description"|property="og:description"|name="twitter:description") content=")[^"]*/g, (_, tag) => tag + description)
          .replace(/(<link rel="canonical" href="|<meta property="og:url" content=")[^"]*/g, (_, tag) => tag + url);
        // Fail the build rather than ship a page that silently kept the homepage's tags.
        const hits = (s) => out.split(s).length - 1;
        if (hits(`<title>${title}</title>`) !== 1 || hits(`content="${title}"`) !== 2 || hits(`content="${description}"`) !== 3 || hits(`"${url}"`) !== 2) {
          throw new Error(`static-route-meta: a <head> tag in index.html no longer matches for /${route}`);
        }
        writeFileSync(resolve(outDir, `${route}.html`), out);
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), staticRouteMeta()]
});
