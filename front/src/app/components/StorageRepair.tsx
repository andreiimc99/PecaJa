"use client";
import { useEffect } from "react";

/**
 * StorageRepair: verifica se window.localStorage foi sobrescrito de forma incorreta
 * (ex.: objeto vazio sem métodos) e injeta um polyfill em memória compatível.
 * Roda apenas no cliente.
 */
export default function StorageRepair() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const ls = (window as unknown as { localStorage?: Storage }).localStorage;
    const needsRepair =
      !ls ||
      typeof ls.getItem !== "function" ||
      typeof ls.setItem !== "function";

    if (!needsRepair) return;

    console.warn(
      "[StorageRepair] localStorage inválido detectado. Injetando polyfill em memória."
    );

    const store = new Map<string, string>();

    const polyfill: Storage = {
      get length() {
        return store.size;
      },
      clear: () => {
        store.clear();
      },
      getItem: (key: string) => {
        return store.has(key) ? store.get(key)! : null;
      },
      key: (index: number) => {
        return Array.from(store.keys())[index] || null;
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
      setItem: (key: string, value: string) => {
        store.set(key, String(value));
      },
    } as Storage;

    try {
      (window as unknown as { localStorage: Storage }).localStorage = polyfill;
      // Teste rápido
      polyfill.setItem("__storage_repair_test__", "ok");
      if (polyfill.getItem("__storage_repair_test__") !== "ok") {
        console.warn("[StorageRepair] Falha ao validar polyfill");
      } else {
        polyfill.removeItem("__storage_repair_test__");
      }
    } catch (e) {
      console.error(
        "[StorageRepair] Não foi possível substituir localStorage",
        e
      );
    }
  }, []);

  return null; // não renderiza nada visível
}
