import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { rankEntries } from './src/leaderboard.js';

const root=path.resolve('dist'),dataFile=path.resolve('leaderboard.json'),mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2'};
if(process.argv[2]==='--export-leaderboard'){
  if(!process.argv[3])throw new Error('Usage: node server.js --export-leaderboard out.json');
  let saved={entries:[]};try{saved=JSON.parse(fs.readFileSync(dataFile,'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
  fs.writeFileSync(path.resolve(process.argv[3]),JSON.stringify({entries:rankEntries(saved.entries??[])},null,2)+'\n');process.exit(0);
}
const server=http.createServer((req,res)=>{
  if(req.url?.split('?')[0]==='/api/leaderboard'){
    if(req.method==='GET'){let data={entries:[]};try{data=JSON.parse(fs.readFileSync(dataFile,'utf8'));}catch{}res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify({entries:rankEntries(data.entries??[])}));return;}
    if(req.method==='POST'){let body='';req.on('data',(chunk)=>{body+=chunk;if(body.length>100000)req.destroy();});req.on('end',()=>{try{const value=JSON.parse(body),entries=rankEntries(value.entries??[]);fs.writeFileSync(dataFile,JSON.stringify({entries},null,2)+'\n');res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify({entries}));}catch{res.writeHead(400);res.end('Invalid leaderboard');}});return;}
    res.writeHead(405);res.end('Method not allowed');return;
  }
  const requested=decodeURIComponent(req.url?.split('?')[0]??'/'),file=path.resolve(root,`.${requested==='/'?'/index.html':requested}`);
  if(!file.startsWith(root+path.sep)&&file!==path.join(root,'index.html')){res.writeHead(403);res.end('Forbidden');return;}
  const target=fs.existsSync(file)&&fs.statSync(file).isFile()?file:path.join(root,'index.html');
  fs.readFile(target,(error,data)=>{if(error){res.writeHead(404);res.end('Build not found. Run npm run build first.');return;}res.writeHead(200,{'content-type':mime[path.extname(target)]??'application/octet-stream'});res.end(data);});
});
const port=Number(process.env.PORT??4173);server.listen(port,'0.0.0.0',()=>process.stdout.write(`Lantern Island ready at http://localhost:${port}\n`));
