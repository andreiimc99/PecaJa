"use client";
import React, { useEffect, useState } from "react";
import storage from "@/app/lib/storage";
import { apiUrl } from "@/app/lib/api-base";

interface FavRow {
  peca_id: number;
  total: number;
}

export default function AdminFavoritosPage() {
  const [rows, setRows] = useState<FavRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const token = storage.get("token");
  const usuario = storage.getJSON<{ role: string }>("usuario");

  useEffect(() => {
    if (!usuario || usuario.role !== "admin") {
      setErro("Acesso restrito ao admin.");
      setLoading(false);
      return;
    }
    fetch(apiUrl("/api/admin/favoritos"), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((data) => setRows(data))
      .catch(() => setErro("Falha ao carregar favoritos."))
      .finally(() => setLoading(false));
  }, [token, usuario]);

  if (loading) return <p>Carregando...</p>;
  if (erro) return <p style={{ color: "#b00" }}>{erro}</p>;

  return (
    <div style={{ padding: 24 }}>
      <h1>Favoritos por Peça</h1>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={th}>Peça ID</th>
            <th style={th}>Total Favoritos</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.peca_id}>
              <td style={td}>{r.peca_id}</td>
              <td style={td}>{r.total}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={2} style={td}>
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
