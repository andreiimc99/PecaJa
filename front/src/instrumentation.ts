// instrumentation.ts — patch SSR seguro para localStorage
// Roda somente no ambiente de servidor (Node/Edge) antes do app.
// Se localStorage não existir ou for inválido, instala um polyfill in-memory.

// Pequeno type helper para tratar o global como objeto mutável sem usar `any`.
type MutableGlobal = Record<string, unknown> & { localStorage?: unknown };

function isValidStorage(x: unknown): x is Storage {
  return (
    typeof x === "object" &&
    x !== null &&
    typeof (x as Storage).getItem === "function" &&
    typeof (x as Storage).setItem === "function" &&
    typeof (x as Storage).removeItem === "function"
  );
}

if (typeof window === "undefined") {
  try {
    const g = globalThis as MutableGlobal;
    // Patch incondicional: não leia g.localStorage para não acionar getters inseguros.
    const store = new Map<string, string>();
    const safeStorage: Storage = {
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
        value: safeStorage,
      });
    } catch {
      (g as MutableGlobal).localStorage = safeStorage;
    }
  } catch {
    // Ignora erros de patch em ambientes restritos
  }
}

export {}; // Mantém o módulo válido para importação automática
