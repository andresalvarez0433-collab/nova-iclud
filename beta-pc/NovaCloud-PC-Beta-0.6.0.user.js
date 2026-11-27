// ==UserScript==
// @name         NovaCloud Gaming PC Beta 0.6.0 - Region Interceptor
// @namespace    novacloud
// @version      0.6.0
// @description  Selector de servidor Xbox Cloud basado en la interceptación de /v2/login/user; diagnóstico de regiones ofrecidas.
// @match        https://www.xbox.com/play*
// @match        https://www.xbox.com/*/play*
// @run-at       document-start
// @grant        unsafeWindow
// ==/UserScript==
(() => {
  'use strict';
  const PAGE = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
  const STORE = 'novacloud_pc_beta_060';
  const STATE_KEY = '__NOVACLOUD_REGION_STATE__';
  if (PAGE[STATE_KEY]?.installed) return;

  const read = () => {
    try { return JSON.parse(PAGE.localStorage.getItem(STORE) || '{}'); }
    catch (_) { return {}; }
  };
  const write = (value) => {
    try { PAGE.localStorage.setItem(STORE, JSON.stringify(value)); } catch (_) {}
  };
  const config = read();
  const state = {
    installed: true,
    interceptor: false,
    loginSeen: false,
    loginStatus: 'Esperando inicio de sesión de Xbox',
    selected: config.region || 'auto',
    offered: [],
    applied: '',
    lastError: ''
  };
  PAGE[STATE_KEY] = state;

  // Keep the native function and intercept the same login response used by xCloud.
  const nativeFetch = PAGE.fetch.bind(PAGE);
  PAGE.fetch = async function(input, init) {
    const url = typeof input === 'string' ? input : (input && input.url) || '';
    const response = await nativeFetch(input, init);
    if (!url.includes('/v2/login/user')) return response;

    state.loginSeen = true;
    state.loginStatus = 'Respuesta de login recibida';
    try {
      if (!response.ok) {
        state.loginStatus = 'Xbox rechazó el login: HTTP ' + response.status;
        return response;
      }
      const payload = await response.clone().json();
      const regions = payload?.offeringSettings?.regions;
      if (!Array.isArray(regions) || !regions.length) {
        state.loginStatus = 'Xbox no devolvió regiones en offeringSettings';
        return response;
      }

      state.offered = regions.map(r => ({
        name: String(r.name || ''),
        baseUri: String(r.baseUri || ''),
        isDefault: !!r.isDefault
      }));
      const selected = state.selected;
      const match = selected && selected !== 'auto'
        ? regions.find(r => r.name === selected)
        : null;

      if (selected && selected !== 'auto' && !match) {
        state.applied = '';
        state.loginStatus = 'La región elegida no está en la lista que Xbox ofreció';
        return response;
      }

      if (match) {
        const chosen = { ...match, isDefault: true };
        payload.offeringSettings.regions = [chosen];
        state.applied = chosen.name;
        state.loginStatus = 'Región preferida aplicada a la respuesta de login';
      } else {
        state.applied = regions.find(r => r.isDefault)?.name || 'Automática';
        state.loginStatus = 'Modo automático: Xbox elige el servidor';
      }

      // Return the modified JSON while preserving the original Response object.
      const patched = response.clone();
      const jsonText = JSON.stringify(payload);
      Object.defineProperty(patched, 'json', { configurable: true, value: () => Promise.resolve(payload) });
      Object.defineProperty(patched, 'text', { configurable: true, value: () => Promise.resolve(jsonText) });
      Object.defineProperty(patched, 'clone', { configurable: true, value: () => {
        const copy = new Response(jsonText, {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers
        });
        Object.defineProperty(copy, 'json', { configurable: true, value: () => Promise.resolve(payload) });
        return copy;
      }});
      return patched;
    } catch (error) {
      state.lastError = String(error?.message || error);
      state.loginStatus = 'Error leyendo la respuesta de login';
      return response;
    }
  };
  state.interceptor = true;

  const css = `
    #nova060{position:fixed;z-index:2147483647;right:16px;bottom:16px;color:#eaf7ff;font:13px/1.45 Segoe UI,Arial}
    #nova060 button,#nova060 select{background:#17253c;color:#eaf7ff;border:1px solid #42dff788;border-radius:8px;padding:8px}
    #nova060 .toggle{font-weight:900;letter-spacing:1px;background:linear-gradient(120deg,#102b43,#28204c);padding:12px 16px;cursor:pointer}
    #nova060 .panel{display:none;width:min(390px,calc(100vw - 28px));max-height:78vh;overflow:auto;margin-bottom:9px;padding:16px;border:1px solid #53e5ff66;border-radius:17px;background:#091426f5;box-shadow:0 12px 50px #000b}
    #nova060 .panel.open{display:block}.title{font-size:18px;font-weight:900;color:#67eaff}.muted{color:#9bb1cc;font-size:11px}
    #nova060 .row{display:flex;justify-content:space-between;align-items:center;gap:8px;margin:9px 0}
    #nova060 .box{padding:11px;margin:9px 0;border:1px solid #6beaff26;border-radius:11px;background:#14213a}
    #nova060 button{cursor:pointer}#nova060 .status{overflow-wrap:anywhere;color:#bdefff}
  `;
  function mount() {
    if (!PAGE.document.body || PAGE.document.getElementById('nova060')) return;
    const style = PAGE.document.createElement('style');
    style.textContent = css;
    PAGE.document.head?.appendChild(style);
    const root = PAGE.document.createElement('div');
    root.id = 'nova060';
    root.innerHTML = `
      <div class="panel" id="nova060-panel">
        <div class="row"><div><div class="title">NOVA CLOUD</div><div class="muted">PC BETA 0.6.0 · REGION INTERCEPTOR</div></div><button id="nova060-close">✕</button></div>
        <div class="box"><b>Servidor de Xbox Cloud</b>
          <div class="row"><select id="nova060-region" style="width:100%"><option value="auto">Automático (Xbox)</option></select></div>
          <div class="row"><button id="nova060-apply">Guardar región y recargar</button><button id="nova060-refresh">Actualizar diagnóstico</button></div>
          <div class="muted">La lista se llena con las regiones reales devueltas por Xbox en /v2/login/user. No es una VPN.</div>
        </div>
        <div class="box"><b>Diagnóstico</b>
          <div class="muted">Interceptor: <span id="nova060-hook">—</span></div>
          <div class="muted">Login detectado: <span id="nova060-login">—</span></div>
          <div class="muted">Estado: <span class="status" id="nova060-status">—</span></div>
          <div class="muted">Región aplicada: <span id="nova060-applied">—</span></div>
          <div class="muted">Regiones ofrecidas: <span id="nova060-offered">—</span></div>
          <div class="muted">Error: <span id="nova060-error">Ninguno</span></div>
        </div>
        <div class="muted">La región del servidor no garantiza que cambie el catálogo: la disponibilidad también depende de la cuenta, el mercado y Xbox.</div>
      </div>
      <button class="toggle" id="nova060-toggle">✦ NOVACLOUD</button>`;
    PAGE.document.body.appendChild(root);
    const panel = root.querySelector('#nova060-panel');
    root.querySelector('#nova060-toggle').onclick = () => panel.classList.toggle('open');
    root.querySelector('#nova060-close').onclick = () => panel.classList.remove('open');
    const select = root.querySelector('#nova060-region');
    function render() {
      const previous = state.selected || 'auto';
      select.innerHTML = '<option value="auto">Automático (Xbox)</option>';
      const regions = state.offered.length ? state.offered : (() => {
        try { return JSON.parse(PAGE.localStorage.getItem(STORE + '_regions') || '[]'); } catch (_) { return []; }
      })();
      regions.forEach(region => {
        const option = PAGE.document.createElement('option');
        option.value = region.name;
        option.textContent = region.name + (region.isDefault ? ' · predeterminada' : '');
        select.appendChild(option);
      });
      select.value = [...select.options].some(o => o.value === previous) ? previous : 'auto';
      root.querySelector('#nova060-hook').textContent = state.interceptor ? 'Activo' : 'No instalado';
      root.querySelector('#nova060-login').textContent = state.loginSeen ? 'Sí' : 'Aún no';
      root.querySelector('#nova060-status').textContent = state.loginStatus;
      root.querySelector('#nova060-applied').textContent = state.applied || 'Pendiente';
      root.querySelector('#nova060-offered').textContent = regions.map(r => r.name).join(', ') || 'Aún no recibidas';
      root.querySelector('#nova060-error').textContent = state.lastError || 'Ninguno';
    }
    root.querySelector('#nova060-apply').onclick = () => {
      const value = select.value;
      const saved = read();
      saved.region = value;
      write(saved);
      PAGE.location.reload();
    };
    root.querySelector('#nova060-refresh').onclick = render;
    render();
    PAGE.setInterval(render, 1200);
  }
  const observer = new MutationObserver(() => {
    if (PAGE.document.body) { observer.disconnect(); mount(); }
  });
  observer.observe(PAGE.document, { childList: true, subtree: true });
  if (PAGE.document.body) mount();
})();