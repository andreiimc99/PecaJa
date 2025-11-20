// instrumentation.ts (raiz) — Patch SSR seguro para localStorage em Node/Edge.
// Objetivo: evitar SecurityError em ambientes Node 22+ onde experimental localStorage
// é inicializado sem `--localstorage-file`. Instalamos um polyfill in-memory simples
// SEM ler o getter original (que pode lançar) e com API de Storage válida.

type MutableGlobal = Record<string, unknown> & { localStorage?: unknown };

function installPolyfill() {
  const g = globalThis as MutableGlobal;
  // Não tentar ler g.localStorage antes do patch.
  const store = new Map<string, string>();
  const poly: Storage = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => {
      store.set(k, String(v));
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
    clear: () => {
      store.clear();
    },
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    get length() {
      return store.size;
    },
  };
  try {
    Object.defineProperty(g as object, "localStorage", {
      configurable: true,
      enumerable: false,
      writable: true,
      value: poly,
    });
  } catch {
    try {
      (g as MutableGlobal).localStorage = poly;
    } catch {
      // Ignora falha
    }
  }
}

try {
  if (!process.env.DISABLE_LS_PATCH && typeof window === "undefined") {
    installPolyfill();
  }
} catch {
  // Ignora erros de patch
}

export async function register() {
  // Espaço reservado para futuras métricas/tracing.
}
