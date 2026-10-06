import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const ROOT = path.resolve(fileURLToPath(new URL("./dist/", import.meta.url)));
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ttf": "font/ttf",
};
const handlers = Object.fromEntries(
  ["chat", "transcribe", "sentiment"].map((name) => [
    name,
    require(`./netlify/functions/${name}.js`).handler,
  ]),
);
export function createServer() {
  return http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, "http://localhost");
      const functionName = url.pathname.match(
        /^\/\.netlify\/functions\/(chat|transcribe|sentiment)$/,
      )?.[1];
      if (functionName) {
        if (req.method !== "POST") {
          res.writeHead(405, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Method not allowed" }));
          return;
        }
        const chunks = [];
        let size = 0;
        for await (const chunk of req) {
          size += chunk.length;
          if (size > 12 * 1024 * 1024) {
            res.writeHead(413);
            res.end();
            return;
          }
          chunks.push(chunk);
        }
        const body = Buffer.concat(chunks);
        const binary = functionName === "transcribe";
        const result = await handlers[functionName]({
          httpMethod: req.method,
          headers: req.headers,
          body: body.toString(binary ? "base64" : "utf8"),
          isBase64Encoded: binary,
        });
        res.writeHead(result.statusCode, {
          ...result.headers,
          "Cache-Control": "no-store",
        });
        res.end(result.body);
        return;
      }
      if (!["GET", "HEAD"].includes(req.method)) {
        res.writeHead(405);
        res.end();
        return;
      }
      const pathname = decodeURIComponent(url.pathname);
      const requested = path.resolve(
        ROOT,
        pathname === "/" ? "index.html" : `.${pathname}`,
      );
      if (
        !requested.startsWith(ROOT + path.sep) ||
        pathname.split("/").some((part) => part.startsWith("."))
      ) {
        res.writeHead(404);
        res.end("Not found");
        return;
      }
      const info = await stat(requested);
      if (!info.isFile()) throw new Error("not-file");
      const extension = path.extname(requested);
      res.writeHead(200, {
        "Content-Type": MIME[extension] || "application/octet-stream",
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "Cache-Control":
          extension === ".html" || pathname === "/sw.js"
            ? "no-cache"
            : "public, max-age=3600",
      });
      res.end(req.method === "HEAD" ? undefined : await readFile(requested));
    } catch {
      if (!res.headersSent) res.writeHead(404);
      res.end("Not found");
    }
  });
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const port = Number(process.env.PORT || 4178);
  createServer().listen(port, process.env.HOST || "127.0.0.1", () =>
    console.log(
      `PokeLearn ready at http://${process.env.HOST || "127.0.0.1"}:${port}`,
    ),
  );
}
