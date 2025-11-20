import storage from "../lib/storage";
import { apiUrl } from "./api-base";

export async function getStatusFavorito(pecaId: number): Promise<boolean> {
  const token = storage.get("token");
  if (!token) return false; // não logado, não favorito
  const res = await fetch(apiUrl(`/api/favoritos/status/${pecaId}`), {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) return false;
  const data = await res.json();
  return !!data.isFavorited;
}

export async function toggleFavorito(
  pecaId: number
): Promise<{ favorited: boolean }> {
  const token = storage.get("token");
  if (!token) throw new Error("Usuário não autenticado.");

  const status = await getStatusFavorito(pecaId);
  if (status) {
    // Remover
    const delRes = await fetch(`${API_BASE}/api/favoritos/${pecaId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!delRes.ok) throw new Error("Falha ao remover favorito.");
    syncLocal(pecaId, false);
    return { favorited: false };
  } else {
    // Adicionar
    const addRes = await fetch(`${API_BASE}/api/favoritos`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ pecaId }),
    });
    if (!addRes.ok) {
      const txt = await addRes.text();
      throw new Error(txt || "Falha ao adicionar favorito.");
    }
    syncLocal(pecaId, true);
    return { favorited: true };
  }
}

function syncLocal(pecaId: number, add: boolean) {
  try {
    const ids = storage.getJSON<number[]>("favoritos") || [];
    const set = new Set(ids);
    if (add) set.add(pecaId);
    else set.delete(pecaId);
    storage.setJSON("favoritos", Array.from(set));
  } catch {}
}
