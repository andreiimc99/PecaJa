"use client";
import React, { useEffect, useState } from "react";
import storage from "@/app/lib/storage";

interface PecaRow {
  id: number;
  nome: string;
  categoria: string;
  quantidade: number;
  preco: number;
  desmanche_nome: string;
}

export default function AdminPecasPage() {
  const [rows, setRows] = useState<PecaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [busy, setBusy] = useState<number | null>(null);
  const token = storage.get("token");
  const usuario = storage.getJSON<{ role: string }>("usuario");

  useEffect(() => {
    if (!usuario || usuario.role !== "admin") {
      setErro("Acesso restrito ao admin.");
      setLoading(false);
      return;
    }
    fetch("http://localhost:3001/api/admin/pecas", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((data) => setRows(data))
      .catch(() => setErro("Falha ao carregar peças."))
      .finally(() => setLoading(false));
  }, [token, usuario]);

  if (loading) return <p>Carregando...</p>;
  if (erro) return <p style={{ color: "#b00" }}>{erro}</p>;

  async function handleDelete(id: number) {
    if (!token) {
      setErro("Sessão inválida. Faça login novamente.");
      return;
    }
    const ok = window.confirm(`Remover peça ${id}? Esta ação é irreversível.`);
    if (!ok) return;
    try {
      setBusy(id);
      await adminDeletePeca(id, token);
      setRows((prev) => prev.filter((p) => p.id !== id));
    } catch (e: any) {
      setErro(e?.message || "Erro ao remover peça.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div style={{ padding: 24 }}>
      <h1>Peças</h1>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={th}>ID</th>
            <th style={th}>Nome</th>
            <th style={th}>Categoria</th>
            <th style={th}>Qtd</th>
            <th style={th}>Preço</th>
            <th style={th}>Desmanche</th>
            <th style={th}>Ações</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td style={td}>{r.id}</td>
              <td style={td}>{r.nome}</td>
              <td style={td}>{r.categoria}</td>
              <td style={td}>{r.quantidade}</td>
              <td style={td}>R$ {r.preco?.toFixed(2)}</td>
              <td style={td}>{r.desmanche_nome || "-"}</td>
              <td style={td}>
                <button
                  onClick={() => handleDelete(r.id)}
                  disabled={busy === r.id}
                  style={btnDanger}
                  title="Remover peça (admin)"
                >
                  {busy === r.id ? "Removendo..." : "Remover"}
                </button>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={7} style={td}>
                Nenhum registro.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

const th: React.CSSProperties = {
  textAlign: "left",
  borderBottom: "2px solid #ddd",
  padding: "8px",
};
const td: React.CSSProperties = {
  borderBottom: "1px solid #eee",
  padding: "6px 8px",
  fontSize: "0.85rem",
};

async function adminDeletePeca(id: number, token: string) {
  const res = await fetch(`http://localhost:3001/api/admin/pecas/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as any).error || "Falha ao remover peça.");
  }
}

const btnDanger: React.CSSProperties = {
  background: "#b00020",
  color: "#fff",
  border: 0,
  borderRadius: 6,
  padding: "6px 10px",
  cursor: "pointer",
};
