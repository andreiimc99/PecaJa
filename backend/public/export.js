// public/export.js

async function downloadResponseAsFile(response, fallbackFilename = 'pecas.csv') {
  if (!response.ok) {
    const txt = await response.text();
    throw new Error(`Erro na exportação: ${response.status} ${txt}`);
  }
  const blob = await response.blob();
  const cd = response.headers.get('Content-Disposition') || '';
  let filename = fallbackFilename;
  const match = cd.match(/filename="?(.*)"?/);
  if (match && match[1]) filename = match[1];

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function getTokenFromInputOrStorage() {
  const input = document.getElementById('token');
  const txt = input && input.value && input.value.trim();
  if (txt) return txt;
  return localStorage.getItem('token');
}

async function exportPecas() {
  try {
    const token = getTokenFromInputOrStorage();
    if (!token) throw new Error('Token não encontrado. Faça login primeiro.');

    const res = await fetch('/api/pecas/exportar', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    await downloadResponseAsFile(res, 'pecas.csv');
  } catch (err) {
    console.error(err);
    alert(err.message);
  }
}

async function exportTemplate() {
  try {
    const token = getTokenFromInputOrStorage();
    if (!token) throw new Error('Token não encontrado. Faça login primeiro.');

    const res = await fetch('/api/pecas/exportar?template=true', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    await downloadResponseAsFile(res, 'template_pecas.csv');
  } catch (err) {
    console.error(err);
    alert(err.message);
  }
}

document.getElementById('btnExport').addEventListener('click', exportPecas);
document.getElementById('btnTemplate').addEventListener('click', exportTemplate);
