"use client";
import React, { useEffect, useState } from "react";
import storage from "@/app/lib/storage";

interface Metrics {
  clientes?: number | { error: true };
  desmanches?: number | { error: true };
  pecas?: number | { error: true };
  favoritos?: number | { error: true };
  movimentacoes?: number | { error: true };
}

export default function AdminMetricsPage() {
  const [data, setData] = useState<Metrics | null>(null);
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
    fetch("http://localhost:3001/api/admin/metrics", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((json) => setData(json))
      .catch(() => setErro("Falha ao carregar métricas."))
      .finally(() => setLoading(false));
  }, [token, usuario]);

  if (loading) return <p>Carregando...</p>;
  if (erro) return <p style={{ color: "#b00" }}>{erro}</p>;

  return (
    <div style={{ padding: 24 }}>
      <h1>Métricas</h1>
      {!data && <p>Nenhum dado.</p>}
      {data && (
        <div style={grid}>
          {renderCard("Clientes", data.clientes)}
          {renderCard("Desmanches", data.desmanches)}
          {renderCard("Peças", data.pecas)}
          {renderCard("Favoritos", data.favoritos)}
          {renderCard("Movimentações", data.movimentacoes)}
        </div>
      )}
    </div>
  );
}

function renderCard(
  label: string,
  value: number | { error: true } | undefined
) {
  const erro = typeof value === "object" && value && "error" in value;
  return (
    <div style={card} key={label}>
      <h2 style={{ margin: "0 0 4px", fontSize: "1rem" }}>{label}</h2>
      <p
        style={{
          margin: 0,
          fontWeight: 600,
          fontSize: "1.2rem",
          color: erro ? "#b00" : "#2c3e50",
        }}
      >
        {erro ? "Erro" : value}
      </p>
    </div>
  );
}

const grid: React.CSSProperties = {
  display: "grid",
  gap: "16px",
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  marginTop: 16,
};
const card: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e2e2e2",
  borderRadius: 8,
  padding: "12px 14px",
  boxShadow: "0 2px 6px rgba(0,0,0,0.06)",
};
