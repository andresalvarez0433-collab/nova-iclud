const { app, BrowserWindow, ipcMain, shell, session, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
let crashLogPath = null;
let quitting = false;
let recoveryAttempts = 0;
function writeLog(label, details) {
  const line = `[${new Date().toISOString()}] ${label} ${details ? JSON.stringify(details) : ''}\\n`;
  try { if (crashLogPath) fs.appendFileSync(crashLogPath, line, 'utf8'); else console.error(line); }
  catch (error) { console.error('[NovaCloud] Could not write crash log:', error); }
}
const TRUSTED = ['xbox.com','www.xbox.com','play.xbox.com','login.live.com','account.microsoft.com','microsoft.com','live.com','xboxlive.com'];
function trusted(url){try{const h=new URL(url).hostname;return TRUSTED.some(d=>h===d||h.endsWith('.'+d));}catch{return false;}}
function createWindow(){
 const win=new BrowserWindow({width:1440,height:900,minWidth:1050,minHeight:680,backgroundColor:'#080d18',webPreferences:{preload:path.join(__dirname,'preload.js'),contextIsolation:true,nodeIntegration:false,webviewTag:true,sandbox:true}});
 writeLog('Main window created', { pid: process.pid });
 win.loadFile(path.join(__dirname,'index.html'));
 win.on('unresponsive', () => writeLog('Main window unresponsive'));
 win.on('responsive', () => writeLog('Main window responsive again'));
 win.on('closed', () => writeLog('Main window closed'));
 win.webContents.on('will-attach-webview',(event,webPreferences,params)=>{
  const src=params.src||'';
  if(src && src!=='about:blank'&&!trusted(src)){event.preventDefault();return;}
  webPreferences.preload=path.join(__dirname,'xcloud-preload.js');
  webPreferences.nodeIntegration=false;
  webPreferences.contextIsolation=true;
  // Better xCloud bridge uses Electron webFrame from its trusted preload.
  // Keep Node disabled in page code and context isolation enabled.
  webPreferences.sandbox=false;
 });
}
app.whenReady().then(()=>{
 try {
  crashLogPath = path.join(app.getPath('userData'), 'NovaCloud-crash.log');
  writeLog('Application started', { version: app.getVersion(), electron: process.versions.electron, chromium: process.versions.chrome, platform: process.platform, arch: process.arch, memory: process.memoryUsage() });
 } catch (error) { console.error('Crash log initialization failed:', error); }
 session.fromPartition('persist:novacloud-xcloud');
 createWindow();
 app.on('activate',()=>{if(BrowserWindow.getAllWindows().length===0)createWindow();});
}).catch(error => writeLog('Application startup failed', { message: error.message, stack: error.stack }));
app.on('web-contents-created',(_e,contents)=>{
 contents.setWindowOpenHandler(({url})=>{if(trusted(url))return {action:'allow'};shell.openExternal(url);return {action:'deny'};});
});
app.on('child-process-gone', (_event, details) => writeLog('Child process gone', details));
app.on('before-quit', () => { quitting = true; writeLog('Application before-quit'); });
app.on('will-quit', () => writeLog('Application will-quit'));
app.on('window-all-closed',()=>{writeLog('All windows closed');if(process.platform!=='darwin')app.quit();});
process.on('uncaughtExceptionMonitor', (error, origin) => writeLog('Uncaught exception monitor', { origin, message: error && error.message, stack: error && error.stack }));
process.on('unhandledRejection', (reason) => writeLog('Unhandled promise rejection', { reason: reason && reason.stack ? reason.stack : String(reason) }));
process.on('exit', (code) => writeLog('Node process exit', { code }));
process.on('warning', (warning) => writeLog('Node warning', { name: warning.name, message: warning.message, stack: warning.stack }));
ipcMain.handle('open-support',()=>shell.openExternal('https://support.xbox.com/help/games-apps/cloud-gaming/setup-cloud-gaming'));
ipcMain.handle('open-betterxcloud',()=>shell.openExternal('https://better-xcloud.github.io/'));
ipcMain.handle('open-spotify',async()=>{try{return await shell.openExternal('spotify:');}catch(error){return shell.openExternal('https://open.spotify.com/');}});

ipcMain.handle('choose-wallpaper',async()=>{const result=await dialog.showOpenDialog({title:'Elegir fondo de NovaCloud',properties:['openFile'],filters:[{name:'Imágenes',extensions:['png','jpg','jpeg','webp','bmp']}]});if(result.canceled||!result.filePaths[0])return null;return 'file:///'+result.filePaths[0].replace(/\\/g,'/').replace(/^\/+/, '');});
