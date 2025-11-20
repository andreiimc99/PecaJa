// Centraliza resolução da base da API.
// Produção: defina NEXT_PUBLIC_API_URL (ex: https://seu-backend.vercel.app)
// Desenvolvimento: fallback para http://localhost:3001
export function apiBase() {
  if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  return typeof window === 'undefined' ? 'http://localhost:3001' : (process.env.NEXT_PUBLIC_API_URL || '');
}

export function apiUrl(path: string) {
  const base = apiBase();
  if (!base) return path.startsWith('/api') ? path : `/api${path}`;
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}
