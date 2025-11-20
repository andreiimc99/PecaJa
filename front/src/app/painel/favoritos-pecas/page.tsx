"use client";
import React, { useEffect, useState, useMemo } from "react";
import Image from "next/image"; // Migrar imagem para next/image
import Link from "next/link";
import { useRouter } from "next/navigation";
import storage from "@/app/lib/storage";
import { apiUrl } from "@/app/lib/api-base";

interface FavoritoAggregado {
  id: number;
  nome: string;
  preco?: number | string | null;
  foto_url?: string | null;
  marca?: string | null;
  modelo?: string | null;
  ano?: string | null;
  tipo?: string | null;
  total_favoritos: number;
}

export default function FavoritosPecasPage() {
  const router = useRouter();
  const [data, setData] = useState<FavoritoAggregado[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [onlyWithFavs, setOnlyWithFavs] = useState(true);

  useEffect(() => {
    const token = storage.get("token");
    const rawUser = storage.get("usuario");
    if (!token || !rawUser) {
      router.replace("/login");
      return;
    }
    try {
      const u = JSON.parse(rawUser);
      if (u.role !== "desmanche") {
        router.replace("/login");
        return;
      }
    } catch {
      router.replace("/login");
      return;
    }
    fetch(apiUrl("/api/favoritos/desmanche"), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          throw new Error(`Status ${res.status} ${txt}`);
        }
        return res.json();
      })
      .then((rows: unknown) => {
        if (!Array.isArray(rows)) {
          throw new Error("Formato inesperado na resposta da API favoritos.");
        }
        const mapped: FavoritoAggregado[] = rows.map(
          (r: Partial<FavoritoAggregado>) => ({
            id: Number(r.id),
            nome: String(r.nome ?? ""),
            preco: r.preco ?? null,
            foto_url: r.foto_url ?? null,
            marca: r.marca ?? null,
            modelo: r.modelo ?? null,
            ano: r.ano ?? null,
            tipo: r.tipo ?? null,
            total_favoritos: Number(r.total_favoritos) || 0,
          })
        );
        setData(mapped);
      })
      .catch((e) => {
        if (/Status 404/.test(String(e))) {
          alert(
            "Rota /api/favoritos/desmanche (404). Reinicie o backend para carregar as rotas atualizadas."
          );
        } else {
          alert(
            "Falha ao buscar favoritos agregados: " +
              (e instanceof Error ? e.message : String(e))
          );
        }
      })
      .finally(() => setLoading(false));
  }, [router]);

  const filtered = useMemo(() => {
    let list = data;
    if (onlyWithFavs) list = list.filter((i) => i.total_favoritos > 0);
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((i) => i.nome.toLowerCase().includes(q));
    }
    return list.sort((a, b) => b.total_favoritos - a.total_favoritos);
  }, [data, search, onlyWithFavs]);

  if (loading) return <div style={{ padding: 32 }}>Carregando...</div>;

  return (
    <div style={{ padding: 32 }}>
      <h1>Peças Favoritadas</h1>
      <div
        style={{ display: "flex", gap: 12, flexWrap: "wrap", margin: "12px 0" }}
      >
        <input
          value={search}
          placeholder="Buscar por nome..."
          onChange={(e) => setSearch(e.target.value)}
          style={{
            padding: "8px 10px",
            border: "1px solid #ccc",
            borderRadius: 8,
          }}
        />
        <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <input
            type="checkbox"
            checked={onlyWithFavs}
            onChange={(e) => setOnlyWithFavs(e.target.checked)}
          />{" "}
          Somente com favoritos
        </label>
        <button
          onClick={() => router.push("/painel")}
          style={{
            marginLeft: "auto",
            padding: "8px 14px",
            borderRadius: 8,
            border: "none",
            background: "#ff8c69",
            color: "#fff",
            fontWeight: 600,
          }}
        >
          Voltar
        </button>
      </div>
      {filtered.length === 0 ? (
        <p>Nenhuma peça encontrada.</p>
      ) : (
        <ul
          style={{
            listStyle: "none",
            padding: 0,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))",
            gap: 16,
          }}
        >
          {filtered.map((p) => (
            <li
              key={p.id}
              style={{
                border: "1px solid #eee",
                borderRadius: 12,
                padding: 12,
                background: "#fff",
                display: "flex",
                gap: 12,
              }}
            >
              <Image
                src={p.foto_url || "/placeholder-peca.png"}
                alt={p.nome}
                width={84}
                height={84}
                style={{
                  width: 84,
                  height: 84,
                  objectFit: "cover",
                  borderRadius: 8,
                }}
              />
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                }}
              >
                <Link
                  href={`/peca/${p.id}`}
                  style={{
                    fontWeight: 700,
                    textDecoration: "none",
                    color: "#2c3e50",
                  }}
                >
                  {p.nome}
                </Link>
                <span style={{ color: "#e74c3c", fontWeight: 600 }}>
                  ❤ {p.total_favoritos}
                </span>
                {typeof p.preco !== "undefined" && p.preco !== null && (
                  <span style={{ fontSize: 12, color: "#555" }}>
                    {Number(p.preco).toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
