// Local-only static preview; no backend, credentials or external connections.
import http from 'node:http';
import {readFile} from 'node:fs/promises';
const root=new URL('./',import.meta.url);
const files={'/':'index.html','/index.html':'index.html','/app.js':'app.js','/style.css':'style.css'};
http.createServer(async(req,res)=>{
 const pathname=new URL(req.url,'http://127.0.0.1').pathname;
 if(!files[pathname]){res.writeHead(404);res.end('Not found');return;}
 try{const body=await readFile(new URL(files[pathname],root));res.writeHead(200,{'Content-Type':pathname.endsWith('.js')?'text/javascript; charset=utf-8':pathname.endsWith('.css')?'text/css; charset=utf-8':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(body)}catch{res.writeHead(500);res.end('Preview file unavailable')}
}).listen(4173,'127.0.0.1',()=>console.log('CrowdPlay preview: http://127.0.0.1:4173'));
