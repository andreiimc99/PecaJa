"use client";
import React, { useEffect, useState } from "react";
import storage from "@/app/lib/storage";
import { apiUrl } from "@/app/lib/api-base";

interface UsuarioRow {
  id: number;
  nome: string;
  email: string;
  tipo: string;
}

export default function AdminUsuariosPage() {
  const [rows, setRows] = useState<UsuarioRow[]>([]);
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
    fetch(apiUrl("/api/admin/usuarios"), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((data) => setRows(data))
      .catch(() => setErro("Falha ao carregar usuários."))
      .finally(() => setLoading(false));
  }, [token, usuario]);

  if (loading) return <p>Carregando...</p>;
  if (erro) return <p style={{ color: "#b00" }}>{erro}</p>;

  async function handleDeleteUser(row: UsuarioRow) {
    if (!token) {
      setErro("Sessão inválida. Faça login novamente.");
      return;
    }
    const kind = row.tipo === "cliente" ? "cliente" : "desmanche";
    const ok = window.confirm(`Remover ${kind} ${row.id} (${row.nome})?`);
    if (!ok) return;
    try {
      setBusy(row.id);
      const url = apiUrl(`/api/admin/usuarios/${kind}/${row.id}`);
      const res = await fetch(url, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as any).error || "Falha ao remover usuário.");
      }
      setRows((prev) => prev.filter((u) => u.id !== row.id));
    } catch (e: any) {
      setErro(e?.message || "Erro ao remover usuário.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div style={{ padding: "24px" }}>
      <h1>Usuários</h1>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={th}>ID</th>
            <th style={th}>Nome</th>
            <th style={th}>Email</th>
            <th style={th}>Tipo</th>
            <th style={th}>Ações</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td style={td}>{r.id}</td>
              <td style={td}>{r.nome}</td>
              <td style={td}>{r.email}</td>
              <td style={td}>{r.tipo}</td>
              <td style={td}>
                <button
                  onClick={() => handleDeleteUser(r)}
                  disabled={busy === r.id}
                  style={btnDanger}
                  title="Remover usuário (admin)"
                >
                  {busy === r.id ? "Removendo..." : "Remover"}
                </button>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td style={td} colSpan={5}>
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
  fontSize: "0.9rem",
};

const btnDanger: React.CSSProperties = {
  background: "#b00020",
  color: "#fff",
  border: 0,
  borderRadius: 6,
  padding: "6px 10px",
  cursor: "pointer",
};
