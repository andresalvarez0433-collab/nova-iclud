// ==UserScript==
// @name         NovaCloud Gaming PC Beta 0.5.0 (prototype)
// @namespace    novacloud
// @version      0.5.0
// @description  Panel experimental, detección de entrada y tracker manual para Xbox Cloud Gaming.
// @match        https://www.xbox.com/play*
// @match        https://www.xbox.com/*/play*
// @run-at       document-idle
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==
(() => {
'use strict';
if (window.__NOVACLOUD_PC_BETA_050__) return;
window.__NOVACLOUD_PC_BETA_050__ = true;
const KEY='novacloud_pc_beta_050';
const defaults={region:'auto',profile:'balanced',stats:{chests:0,eliminations:0,deaths:0,wins:0,matches:0}};
let data;
try { data=(typeof GM_getValue==='function' ? GM_getValue(KEY,null) : null) || JSON.parse(localStorage.getItem(KEY)||'null') || defaults; } catch(e){ data=defaults; }
const save=()=>{try{if(typeof GM_setValue==='function')GM_setValue(KEY,data);else localStorage.setItem(KEY,JSON.stringify(data));}catch(e){}};
const css=`
#nova050{position:fixed;z-index:2147483647;right:16px;bottom:16px;color:#eaf7ff;font:13px/1.5 Segoe UI,Arial}
#nova050 button,#nova050 select{background:#17253c;color:#eaf7ff;border:1px solid #42dff788;border-radius:8px;padding:7px 10px}
#nova050 .launch{font-weight:800;letter-spacing:1px;background:linear-gradient(120deg,#102b43,#28204c);padding:12px 16px;cursor:pointer}
#nova050 .panel{display:none;width:min(370px,calc(100vw - 28px));max-height:75vh;overflow:auto;margin-bottom:9px;padding:16px;border:1px solid #53e5ff66;border-radius:17px;background:#091426f5;box-shadow:0 12px 50px #000b}
#nova050 .panel.open{display:block}.title{font-size:18px;font-weight:900;color:#67eaff}.muted{color:#9bb1cc;font-size:11px}
#nova050 .row{display:flex;justify-content:space-between;align-items:center;gap:8px;margin:9px 0}
#nova050 .box{padding:10px;margin:9px 0;border:1px solid #6beaff26;border-radius:11px;background:#14213a}
#nova050 button{cursor:pointer}#nova050 .stat{display:grid;grid-template-columns:1fr auto auto;gap:7px;align-items:center;margin:6px 0}
`;
const st=document.createElement('style');st.textContent=css;document.head.appendChild(st);
const root=document.createElement('div');root.id='nova050';
root.innerHTML=`<div class="panel" id="np"><div class="row"><div><div class="title">NOVA CLOUD</div><div class="muted">PC BETA 0.5.0 · EXPERIMENTAL</div></div><button id="close">✕</button></div>
<div class="box"><b>Región preferida</b><div class="row"><select id="region"><option value="auto">Automática</option><option value="north-america">Norteamérica</option><option value="south-america">Sudamérica</option><option value="europe">Europa</option><option value="asia">Asia</option><option value="australia">Australia</option></select><button id="reload">Aplicar y recargar</button></div><div class="muted">Esta preferencia todavía no modifica la negociación real del servidor Xbox.</div></div>
<div class="box"><b>Entrada detectada</b><div id="input" class="muted">Esperando actividad…</div></div>
<div class="box"><b>Game Tracker · contadores manuales</b><div class="muted">Fortnite / sesión actual</div><div id="stats"></div><button id="reset">Reiniciar contadores</button></div>
<div class="box"><b>Perfil de transmisión</b><div class="row"><select id="profile"><option value="balanced">Equilibrado</option><option value="latency">Baja latencia</option><option value="quality">Calidad</option></select></div><div class="muted">Preferencia local; no cambia FPS, resolución ni bitrate del stream.</div></div>
<div class="muted">Beta experimental. Requiere pruebas en tu cuenta. No es una integración verificada de Better xCloud.</div></div>
<button class="launch" id="toggle">✦ NOVACLOUD</button>`;
document.body.appendChild(root);
const panel=root.querySelector('#np');
const labels={chests:'Cofres',eliminations:'Eliminaciones',deaths:'Muertes',wins:'Victorias',matches:'Partidas'};
function render(){
root.querySelector('#region').value=data.region||'auto';root.querySelector('#profile').value=data.profile||'balanced';
const box=root.querySelector('#stats');box.innerHTML='';
Object.entries(labels).forEach(([k,label])=>{const row=document.createElement('div');row.className='stat';const name=document.createElement('span');name.textContent=label;const n=document.createElement('b');n.textContent=data.stats[k]||0;const controls=document.createElement('span');const minus=document.createElement('button');minus.textContent='−';minus.onclick=()=>change(k,-1);const plus=document.createElement('button');plus.textContent='+';plus.onclick=()=>change(k,1);controls.append(minus,plus);row.append(name,n,controls);box.append(row);});
}
function change(k,d){data.stats[k]=Math.max(0,(data.stats[k]||0)+d);save();render();}
root.querySelector('#toggle').onclick=()=>panel.classList.toggle('open');
root.querySelector('#close').onclick=()=>panel.classList.remove('open');
root.querySelector('#region').onchange=e=>{data.region=e.target.value;save();};
root.querySelector('#profile').onchange=e=>{data.profile=e.target.value;save();};
root.querySelector('#reload').onclick=()=>{save();location.reload();};
root.querySelector('#reset').onclick=()=>{if(confirm('¿Reiniciar los contadores?')){data.stats={chests:0,eliminations:0,deaths:0,wins:0,matches:0};save();render();}};
const input=root.querySelector('#input');
window.addEventListener('keydown',()=>input.textContent='Teclado detectado',{passive:true});
window.addEventListener('mousemove',()=>input.textContent='Ratón detectado',{passive:true});
window.addEventListener('touchstart',()=>input.textContent='Pantalla táctil detectada',{passive:true});
window.addEventListener('gamepadconnected',()=>input.textContent='Mando conectado');
render();
})();