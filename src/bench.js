import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

function parse(argv){const out={};for(let i=0;i<argv.length;i+=2){if(!['--seed','--duration','--out'].includes(argv[i])||!argv[i+1])throw new Error(`Unknown or missing argument: ${argv[i]}`);out[argv[i]]=argv[i+1];}const seed=Number(out['--seed']??42),duration=Number(out['--duration']??30);if(!Number.isInteger(seed)||!Number.isFinite(duration)||duration<=0||duration>600)throw new Error('seed must be an integer and duration must be 0–600 seconds');return{seed,duration,out:out['--out']};}
async function freePort(){const server=net.createServer();await new Promise((resolve)=>server.listen(0,'127.0.0.1',resolve));const port=server.address().port;await new Promise((resolve)=>server.close(resolve));return port;}
async function waitFor(url,child,timeout=30000){const end=Date.now()+timeout;while(Date.now()<end){if(child.exitCode!==null)throw new Error(`Chrome exited with code ${child.exitCode}`);try{const r=await fetch(url);if(r.ok)return await r.json();}catch{}await delay(150);}throw new Error(`Timed out waiting for ${url}`);}
async function waitHttp(url,child,timeout=30000){const end=Date.now()+timeout;while(Date.now()<end){if(child.exitCode!==null)throw new Error(`Vite exited with code ${child.exitCode}`);try{const r=await fetch(url);if(r.ok)return;}catch{}await delay(150);}throw new Error(`Timed out waiting for ${url}`);}
const {seed,duration,out}=parse(process.argv.slice(2));
const root=path.resolve('.'),chrome=process.env.CHROME_BIN??'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',profile=fs.mkdtempSync(path.join(os.tmpdir(),'lantern-bench-'));
const vitePort=await freePort(),cdpPort=await freePort();let server,browser,socket;
try{
  server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port',String(vitePort),'--strictPort'],{cwd:root,stdio:'ignore'});
  await waitHttp(`http://127.0.0.1:${vitePort}/`,server,30000);
  const candidates=[chrome,'/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser'];const executable=candidates.find((candidate)=>fs.existsSync(candidate));
  if(!executable)throw new Error('Chrome/Chromium was not found; set CHROME_BIN to its executable path.');
  const gpuFlags=process.env.BENCH_SOFTWARE_GL==='1'?['--enable-unsafe-swiftshader']:['--ignore-gpu-blocklist',...(process.platform==='darwin'?['--use-angle=metal']:[])],extraFlags=(process.env.BENCH_CHROME_FLAGS??'').split(' ').filter(Boolean);
  const url=`http://127.0.0.1:${vitePort}/?bench=${seed}&duration=${duration}`;
  browser=spawn(executable,[`--remote-debugging-port=${cdpPort}`,`--user-data-dir=${profile}`,'--headless=new','--no-first-run','--no-default-browser-check','--window-size=1280,720','--force-device-scale-factor=1','--disable-frame-rate-limit','--disable-gpu-vsync','--enable-webgl',...gpuFlags,...extraFlags,url],{stdio:'ignore'});
  await waitFor(`http://127.0.0.1:${cdpPort}/json/version`,browser);
  const deadline=Date.now()+30000;let target;
  while(Date.now()<deadline){const targets=await (await fetch(`http://127.0.0.1:${cdpPort}/json`)).json();target=targets.find((item)=>item.type==='page'&&item.url.includes('?bench='));if(target)break;await delay(100);}
  if(!target)throw new Error('Could not find benchmark page in Chrome');
  socket=new WebSocket(target.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
  let id=0;const pending=new Map();socket.addEventListener('message',(event)=>{const message=JSON.parse(event.data);if(message.id&&pending.has(message.id)){pending.get(message.id)(message);pending.delete(message.id);}});
  const send=(method,params={})=>new Promise((resolve,reject)=>{const commandId=++id;pending.set(commandId,(message)=>message.error?reject(new Error(message.error.message)):resolve(message.result));socket.send(JSON.stringify({id:commandId,method,params}));});
  await send('Emulation.setDeviceMetricsOverride',{width:1280,height:720,deviceScaleFactor:1,mobile:false});
  let result;
  while(Date.now()<deadline+duration*1000+15000){const response=await send('Runtime.evaluate',{expression:'window.__benchResult??null',returnByValue:true});result=response.result?.value??null;if(result)break;await delay(500);}
  if(!result)throw new Error('Benchmark did not return results before timeout');
  const report={...result,avg_fps:Math.round(result.avg_fps*10)/10,p1_low_fps:Math.round(result.p1_low_fps*10)/10,frame_ms_p95:Math.round(result.frame_ms_p95*100)/100,load_ms:Math.round(result.load_ms),vsync_off:true,machine:{platform:process.platform,arch:os.arch(),os_release:os.release(),cpu:os.cpus()[0]?.model??'unknown',cpu_cores:os.cpus().length,ram_gb:Math.round(os.totalmem()/2**30),node:process.version,browser:result.os.match(/(?:Headless)?Chrome\/[\d.]+/)?.[0]??'unknown',gpu_mode:process.env.BENCH_SOFTWARE_GL==='1'?'software (SwiftShader)':'hardware (default flags)'}};
  const json=JSON.stringify(report,null,2)+'\n';if(out)fs.writeFileSync(path.resolve(out),json);else process.stdout.write(json);
}finally{try{socket?.close();}catch{}for(const child of [browser,server])if(child&&!child.killed)child.kill('SIGTERM');await delay(300);fs.rmSync(profile,{recursive:true,force:true});}
