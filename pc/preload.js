const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('nova',{openXbox:()=>ipcRenderer.invoke('open-xbox'),openSupport:()=>ipcRenderer.invoke('open-support')});
