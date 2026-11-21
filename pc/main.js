const { app, BrowserWindow, ipcMain, shell, session, dialog } = require('electron');
const path = require('path');
const TRUSTED = ['xbox.com','www.xbox.com','play.xbox.com','login.live.com','account.microsoft.com','microsoft.com','live.com','xboxlive.com'];
function trusted(url){try{const h=new URL(url).hostname;return TRUSTED.some(d=>h===d||h.endsWith('.'+d));}catch{return false;}}
function createWindow(){
 const win=new BrowserWindow({width:1440,height:900,minWidth:1050,minHeight:680,backgroundColor:'#080d18',webPreferences:{preload:path.join(__dirname,'preload.js'),contextIsolation:true,nodeIntegration:false,webviewTag:true,sandbox:true}});
 win.loadFile(path.join(__dirname,'index.html'));
 win.webContents.on('will-attach-webview',(event,webPreferences,params)=>{
  const src=params.src||'';
  if(src!=='about:blank'&&!trusted(src)){event.preventDefault();return;}
  webPreferences.preload=path.join(__dirname,'xcloud-preload.js');
  webPreferences.nodeIntegration=false;
  webPreferences.contextIsolation=true;
 });
}
app.whenReady().then(()=>{session.fromPartition('persist:novacloud-xcloud');createWindow();app.on('activate',()=>{if(BrowserWindow.getAllWindows().length===0)createWindow();});});
app.on('web-contents-created',(_e,contents)=>{
 contents.setWindowOpenHandler(({url})=>{if(trusted(url))return {action:'allow'};shell.openExternal(url);return {action:'deny'};});
});
app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit();});
ipcMain.handle('open-support',()=>shell.openExternal('https://support.xbox.com/help/games-apps/cloud-gaming/setup-cloud-gaming'));
ipcMain.handle('open-betterxcloud',()=>shell.openExternal('https://better-xcloud.github.io/'));
ipcMain.handle('open-spotify',async()=>{try{return await shell.openExternal('spotify:');}catch(error){return shell.openExternal('https://open.spotify.com/');}});

ipcMain.handle('choose-wallpaper',async()=>{const result=await dialog.showOpenDialog({title:'Elegir fondo de NovaCloud',properties:['openFile'],filters:[{name:'Imágenes',extensions:['png','jpg','jpeg','webp','bmp']}]});if(result.canceled||!result.filePaths[0])return null;return 'file:///'+result.filePaths[0].replace(/\\/g,'/').replace(/^\/+/, '');});
