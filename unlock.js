// unlock.js - Gate de senha do dashboard publicado (2026-06-12)
// Local (file://): manu_data.js existe em claro -> sem senha.
// Online (gh-pages): so manu_data.enc.js (AES-256-GCM) -> overlay pede senha,
// decifra via WebCrypto. Parametros espelhados com lib_dashboard_crypto.ps1:
// PBKDF2-SHA256 100000 iter -> AES-GCM 256 (nonce 12B, tag anexa no ct).
// Senha errada = tag mismatch = excecao (nunca renderiza lixo).

(function () {
  const b64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));

  // BUG FIX 2026-06-12: `const X = ...` em script NAO vira window.X — checar
  // via typeof do identificador (safe mesmo se nao declarado)
  function getEnc() { try { return (typeof MANU_DATA_ENC !== 'undefined') ? MANU_DATA_ENC : window.MANU_DATA_ENC; } catch (e) { return undefined; } }
  function hasPlain() { try { return (typeof MANU_DATA !== 'undefined') || !!window.MANU_DATA; } catch (e) { return false; } }

  async function decryptData(pw) {
    const e = getEnc();
    const km = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveKey']);
    const key = await crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: b64(e.s), iterations: 100000, hash: 'SHA-256' },
      km, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64(e.iv) }, key, b64(e.ct));
    return JSON.parse(new TextDecoder().decode(pt));
  }

  function ready() { if (typeof window.onDataReady === 'function') window.onDataReady(); }

  function showOverlay() {
    const ov = document.createElement('div');
    ov.id = 'unlock-overlay';
    ov.style.cssText = 'position:fixed;inset:0;background:#0a0e14;z-index:9999;display:flex;align-items:center;justify-content:center;font-family:Consolas,monospace';
    ov.innerHTML = `
      <div style="background:#0d1117;border:1px solid #1f2733;border-radius:12px;padding:34px 38px;text-align:center;max-width:340px">
        <div style="font-size:30px;margin-bottom:10px">🔐</div>
        <div style="color:#58a6ff;font-size:14px;letter-spacing:1px;margin-bottom:4px">MANUHEADFUND</div>
        <div style="color:#495766;font-size:11px;margin-bottom:18px">dados cifrados AES-256-GCM</div>
        <input id="unlock-pw" type="password" placeholder="senha" autocomplete="current-password"
          style="width:100%;background:#0a0e14;border:1px solid #2f3a4a;border-radius:8px;color:#e6edf3;padding:10px 12px;font-size:14px;outline:none;text-align:center">
        <div id="unlock-err" style="color:#f85149;font-size:11px;min-height:16px;margin-top:8px"></div>
        <button id="unlock-btn" style="margin-top:8px;width:100%;background:#1f6feb;border:none;border-radius:8px;color:#fff;padding:10px;font-size:13px;cursor:pointer">Desbloquear</button>
      </div>`;
    document.body.appendChild(ov);
    const pwEl = document.getElementById('unlock-pw');
    const tryIt = async () => {
      const pw = pwEl.value;
      if (!pw) return;
      document.getElementById('unlock-err').textContent = '';
      try {
        window.MANU_DATA = await decryptData(pw);
        sessionStorage.setItem('mhf_pw', pw);
        ov.remove();
        ready();
      } catch (e) {
        document.getElementById('unlock-err').textContent = 'senha incorreta';
        pwEl.select();
      }
    };
    document.getElementById('unlock-btn').onclick = tryIt;
    pwEl.addEventListener('keydown', e => { if (e.key === 'Enter') tryIt(); });
    pwEl.focus();
  }

  window.addEventListener('DOMContentLoaded', async () => {
    if (hasPlain()) { ready(); return; }                 // local: dados em claro
    if (getEnc() === undefined) { ready(); return; }     // sem dados nenhuns
    const saved = sessionStorage.getItem('mhf_pw');
    if (saved) {
      try { window.MANU_DATA = await decryptData(saved); ready(); return; } catch (e) { sessionStorage.removeItem('mhf_pw'); }
    }
    showOverlay();
  });
})();
