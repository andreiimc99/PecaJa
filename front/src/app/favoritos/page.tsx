"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image"; // Migrando imagens para next/image
import Link from "next/link";
import { useRouter } from "next/navigation";
import "./Favoritos.css";
import storage from "../lib/storage";

// Estrutura vinda do backend (pecas p.*)
interface PecaDb {
  id: number;
  nome: string;
  preco?: number;
  foto_url?: string | null;
  desmanche_id?: number | null;
  nome_desmanche?: string | null; // pode existir se o backend passar
}

// Estrutura usada na UI
interface PecaFavorita {
  id: number;
  nome: string;
  preco: number;
  desmanche?: { id?: number | null; nomeFantasia?: string | null };
  imagemUrl?: string | null;
}

export default function FavoritosPage() {
  const router = useRouter();
  const [favoritos, setFavoritos] = useState<PecaFavorita[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<number | null>(null);

  useEffect(() => {
    const fetchFavoritos = async () => {
      // Bloqueia acesso para usuários que não sejam clientes
      const stored = storage.getJSON<{ role?: string }>("usuario");
      if (!stored) {
        router.push("/login");
        return;
      }
      if (stored.role === "admin") {
        router.push("/painel/admin");
        return;
      }
      if (stored.role === "desmanche") {
        router.push("/painel");
        return;
      }
      try {
        const token = storage.get("token");
        if (!token)
          throw new Error("Você precisa estar logado para ver seus favoritos.");

        const apiBase =
          process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
        const res = await fetch(`${apiBase}/api/favoritos`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status === 401 || res.status === 403) {
          setError("Sessão expirada. Entre novamente.");
          return;
        }
        if (!res.ok)
          throw new Error(`Falha ao buscar os favoritos (HTTP ${res.status}).`);
        const data: PecaDb[] = await res.json();

        const mapped: PecaFavorita[] = data.map((p) => ({
          id: p.id,
          nome: p.nome,
          preco: Number(p.preco || 0),
          imagemUrl: p.foto_url ?? null,
          desmanche: {
            id: p.desmanche_id ?? null,
            nomeFantasia: p.nome_desmanche ?? null,
          },
        }));

        setFavoritos(mapped);
      } catch (err: unknown) {
        // Fallback: se API falhar, tenta carregar via localStorage e endpoint público
        try {
          const ids = storage.getJSON<number[]>("favoritos") || [];
          if (!ids.length) throw err; // se não houver favoritos locais, mantém o erro original

          const apiBase =
            process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
          const results = await Promise.all(
            ids.map(async (id) => {
              const r = await fetch(`${apiBase}/api/pecas/public/${id}`);
              if (!r.ok) return null;
              const p = (await r.json()) as Partial<PecaDb> & {
                id: number;
              };
              const mapped: PecaFavorita = {
                id: p.id,
                nome: p.nome ?? "",
                preco: Number(p.preco || 0),
                imagemUrl: p.foto_url ?? null,
                desmanche: {
                  id: p.desmanche_id ?? null,
                  nomeFantasia: p.nome_desmanche ?? null,
                },
              };
              return mapped;
            })
          );
          const cleaned = results.filter(Boolean) as PecaFavorita[];
          setFavoritos(cleaned);
          setError(null);
        } catch {
          const msg = err instanceof Error ? err.message : String(err);
          setError(msg);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchFavoritos();
  }, []);

  const handleRemover = async (pecaId: number) => {
    try {
      const token = storage.get("token");
      if (!token) {
        router.push("/login");
        return;
      }
      setRemovingId(pecaId);
      // Atualiza favoritos no localStorage para uma experiência imediata
      try {
        const ids = storage.getJSON<number[]>("favoritos") || [];
        const updated = ids.filter((id) => id !== pecaId);
        storage.setJSON("favoritos", updated);
      } catch {}
      const apiBase =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const res = await fetch(`${apiBase}/api/favoritos/${pecaId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        console.warn("Falha ao remover no servidor:", res.status, txt);
      }
      setFavoritos((prev) => prev.filter((f) => f.id !== pecaId));
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setRemovingId(null);
    }
  };

  // Renderização durante o carregamento
  if (loading) {
    return (
      <div className="favoritos-container status-message">
        Carregando seus favoritos...
      </div>
    );
  }

  // Renderização em caso de erro
  if (error) {
    return (
      <div className="favoritos-container status-message error">{error}</div>
    );
  }

  return (
    <main className="favoritos-container">
      <h1>Meus Favoritos</h1>

      {favoritos.length === 0 ? (
        <div className="sem-favoritos">
          <p>Você ainda não tem nenhuma peça favoritada.</p>
          <Link href="/" className="btn-explorar">
            Explorar Peças
          </Link>
        </div>
      ) : (
        <ul className="favoritos-lista">
          {favoritos.map((item) => (
            <li key={item.id} className="favorito-item">
              <Link
                href={`/peca/${item.id}`}
                className="item-nome-link"
                style={{ display: "flex", alignItems: "center", flex: 1 }}
              >
                <Image
                  src={item.imagemUrl || "/placeholder-peca.png"}
                  alt={item.nome}
                  width={84}
                  height={84}
                  className="item-imagem"
                />
                <div className="item-detalhes">
                  <h3 className="item-nome">{item.nome}</h3>
                  <p className="item-preco">
                    {Number(item.preco || 0).toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </p>
                  {item.desmanche?.nomeFantasia && (
                    <p className="item-desmanche">
                      Vendido por: {item.desmanche.nomeFantasia}
                    </p>
                  )}
                </div>
              </Link>
              <button
                className="remover-btn"
                title="Remover dos Favoritos"
                onClick={() => handleRemover(item.id)}
                disabled={removingId === item.id}
                aria-busy={removingId === item.id}
              >
                &times;
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
