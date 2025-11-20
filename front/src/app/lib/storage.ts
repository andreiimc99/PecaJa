"use client";
/**
 * Wrapper seguro para acesso ao localStorage em ambiente Next.js (App Router).
 * Garante que chamadas só ocorram no client e que não quebrem se o storage estiver
 * indisponível ou alterado por algum polyfill incorreto.
 */
// Wrapper minimalista com tolerância a ambientes onde localStorage foi sobrescrito sem métodos válidos.
// Nunca lança exceção; retorna null/false silenciosamente.

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue =
  | JsonPrimitive
  | { [key: string]: JsonValue }
  | JsonValue[];

function safeLocalStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  const candidate = (window as unknown as { localStorage?: unknown }).localStorage;
  // Verifica se já é um Storage válido
  if (
    candidate &&
    typeof (candidate as Storage).getItem === "function" &&
    typeof (candidate as Storage).setItem === "function" &&
    typeof (candidate as Storage).removeItem === "function"
  ) {
    return candidate as Storage;
  }
  // Se inválido, tenta instalar um mock em memória NO-OP
  try {
    const store = new Map<string, string>();
    const mock: Storage = {
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
    (window as unknown as { localStorage: Storage }).localStorage = mock;
    return mock;
  } catch {
    return null;
  }
}

const storage = {
  available(): boolean {
    return !!safeLocalStorage();
  },
  get(key: string): string | null {
    const ls = safeLocalStorage();
    if (!ls) return null;
    try {
      return ls.getItem(key);
    } catch {
      return null;
    }
  },
  getJSON<T = JsonValue>(key: string): T | null {
    const raw = this.get(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  },
  set(key: string, value: string): boolean {
    const ls = safeLocalStorage();
    if (!ls) return false;
    try {
      ls.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  },
  setJSON(key: string, value: JsonValue): boolean {
    try {
      return this.set(key, JSON.stringify(value));
    } catch {
      return false;
    }
  },
  remove(key: string): boolean {
    const ls = safeLocalStorage();
    if (!ls) return false;
    try {
      ls.removeItem(key);
      return true;
    } catch {
      return false;
    }
  },
  clear(): boolean {
    const ls = safeLocalStorage();
    if (!ls) return false;
    try {
      ls.clear();
      return true;
    } catch {
      return false;
    }
  },
};

export default storage;
