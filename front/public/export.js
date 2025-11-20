// public/export.js
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('exportBtn');
  const tokenInput = document.getElementById('token');
  const msg = document.getElementById('msg');

  btn.addEventListener('click', async () => {
    msg.textContent = '';
    let token = tokenInput.value.trim();
    if (!token) { msg.textContent = 'Cole um token válido.'; return; }
    if (!token.toLowerCase().startsWith('bearer ')) token = 'Bearer ' + token;

    try {
      const res = await fetch('/download-csv', {
        method: 'GET',
        headers: {
          'Authorization': token
        }
      });

      if (!res.ok) {
        const text = await res.text();
        msg.textContent = `Erro: ${res.status} ${text}`;
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'produtos_export.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      msg.style.color = '#080';
      msg.textContent = 'Download iniciado.';
    } catch (err) {
      msg.textContent = 'Falha ao baixar: ' + err.message;
    }
  });
});
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('download');
  const tokenInput = document.getElementById('token');
  const status = document.getElementById('status');

  btn.addEventListener('click', async () => {
    const raw = tokenInput.value.trim();
    if (!raw) {
      status.textContent = 'Cole um token antes de continuar.';
      return;
    }

    const token = raw.startsWith('Bearer ') ? raw : 'Bearer ' + raw;
    status.textContent = 'Buscando CSV...';

    try {
      const res = await fetch('/download-csv', {
        method: 'GET',
        headers: {
          'Authorization': token
        }
      });

      if (!res.ok) {
        let errMsg = res.statusText;
        try { const j = await res.json(); if (j && j.error) errMsg = j.error; } catch(e){}
        status.textContent = 'Erro: ' + errMsg;
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'export.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      status.textContent = 'Download iniciado.';
    } catch (err) {
      status.textContent = 'Erro ao buscar CSV: ' + err.message;
    }
  });
});
