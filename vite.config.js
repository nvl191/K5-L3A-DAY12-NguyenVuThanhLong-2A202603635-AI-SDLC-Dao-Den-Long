import fs from 'node:fs';
import path from 'node:path';
import { rankEntries } from './src/leaderboard.js';

function leaderboardApi(){return{name:'local-leaderboard-api',configureServer(server){server.middlewares.use('/api/leaderboard',(req,res,next)=>{
  const file=path.resolve('leaderboard.json');
  if(req.method==='GET'){let data={entries:[]};try{data=JSON.parse(fs.readFileSync(file,'utf8'));}catch{}res.setHeader('content-type','application/json');res.end(JSON.stringify({entries:rankEntries(data.entries??[])}));return;}
  if(req.method!=='POST')return next();let body='';req.on('data',(chunk)=>{body+=chunk;if(body.length>100000)req.destroy();});req.on('end',()=>{try{const value=JSON.parse(body),entries=rankEntries(value.entries??[]);fs.writeFileSync(file,JSON.stringify({entries},null,2)+'\n');res.setHeader('content-type','application/json');res.end(JSON.stringify({entries}));}catch{res.statusCode=400;res.end('Invalid leaderboard');}});
});}};}

export default {plugins:[leaderboardApi()]};
