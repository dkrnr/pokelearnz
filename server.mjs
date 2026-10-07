import http from "node:http";
import {Readable} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(fileURLToPath(new URL("./dist/", import.meta.url)));
const MIME = {
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".gif": "image/gif",
  ".ttf": "font/ttf",
  ".woff": "font/woff",
  ".webp": "image/webp",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
};
const handlers = Object.fromEntries(await Promise.all(['chat','transcribe','health'].map(async name=>[name,(await import(`./netlify/functions/${name}.mjs`)).default])));
const securityHeaders=Object.fromEntries((await readFile(new URL('./_headers',import.meta.url),'utf8')).split('\n').filter(line=>/^  [\w-]+:/.test(line)).map(line=>{const split=line.indexOf(':');return [line.slice(2,split),line.slice(split+1).trim()];}));
export function createServer() {
  return http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, "http://localhost");
      const functionName=url.pathname.match(/^\/(?:\.netlify\/functions|api)\/(chat|transcribe|health)$/)?.[1];
      if(functionName){
        const cancellation=new AbortController();req.on('aborted',()=>cancellation.abort());res.on('close',()=>{if(!res.writableEnded)cancellation.abort();});
        const chunks=[];let size=0;
        for await(const chunk of req){size+=chunk.length;if(size>2*1024*1024+8192){res.writeHead(413,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify({code:'REQUEST_TOO_LARGE'}));return;}chunks.push(chunk);}
        const origin=`http://${req.headers.host||'127.0.0.1'}`;
        const request=new Request(new URL(req.url,origin),{method:req.method,headers:req.headers,signal:cancellation.signal,...(!['GET','HEAD'].includes(req.method)?{body:Buffer.concat(chunks)}:{})});
        const response=await handlers[functionName](request,{ip:req.socket.remoteAddress});
        res.writeHead(response.status,Object.fromEntries(response.headers));
        if(response.body)await pipeline(Readable.fromWeb(response.body),res);else res.end();return;
      }
      if(url.pathname.startsWith("/api/")||url.pathname.startsWith("/.netlify/functions/")){res.writeHead(404,{"Content-Type":"application/json","Cache-Control":"no-store"});res.end(JSON.stringify({code:"NOT_FOUND"}));return;}
      if (!["GET", "HEAD"].includes(req.method)) {
        res.writeHead(405);
        res.end();
        return;
      }
      const pathname = decodeURIComponent(url.pathname);
      const requested = path.resolve(
        ROOT,
        pathname === "/" ? "index.html" : /^\/(about|parents|privacy|contact)\/?$/.test(pathname) ? `.${pathname.replace(/\/$/,'')}/index.html` : `.${pathname}`,
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
        ...securityHeaders,
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
