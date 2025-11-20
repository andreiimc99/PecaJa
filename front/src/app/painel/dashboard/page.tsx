"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useEffect, useState } from "react";
import styles from "./dashboard.module.css";
import { useRouter } from "next/navigation";
import BarChart from "./BarChart";
import LineChart from "./LineChart";
import DonutChart from "./DonutChart";
import Sparkline from "./Sparkline";
import storage from "../../lib/storage";

export default function PainelDashboard() {
  const router = useRouter();
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    let aborted = false;
    const controller = new AbortController();

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const token =
          typeof window !== "undefined" ? storage.get("token") : null;
        const headers: Record<string, string> = { Accept: "application/json" };
        if (token) headers.Authorization = `Bearer ${token}`;

        const res = await fetch(`${apiBase}/api/pecas/metrics`, {
          headers,
          signal: controller.signal,
        });
        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          throw new Error(`HTTP ${res.status} ${txt}`);
        }
        const data = await res.json();
        if (!aborted) setMetrics(data);
      } catch (err: unknown) {
        if ((err as any)?.name === "AbortError") return;
        console.error("Erro ao carregar métricas", err);
        const msg = err instanceof Error ? err.message : String(err);
        if (!aborted) setError(msg || "Erro");
      } finally {
        if (!aborted) setLoading(false);
      }
    };

    load();

    // re-load metrics when user logs in/out elsewhere (login page dispatches 'login')
    const onLogin = () => load();
    const onLogout = () => load();
    window.addEventListener("login", onLogin);
    window.addEventListener("logout", onLogout);

    return () => {
      aborted = true;
      controller.abort();
      window.removeEventListener("login", onLogin);
      window.removeEventListener("logout", onLogout);
    };
  }, []);

  // derive small series for charts from movimentacoes
  const last7Labels = (() => {
    const days = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];
    const now = new Date();
    const labels = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      labels.push(days[d.getDay()]);
    }
    return labels;
  })();

  const movimentacoesSeries = React.useMemo(() => {
    if (!metrics || !metrics.movimentacoes) return [0, 0, 0, 0, 0, 0, 0];
    const counts = new Array(7).fill(0);
    const now = new Date();
    for (const mv of metrics.movimentacoes) {
      const d = new Date(mv.data_movimentacao);
      const diff = Math.floor((+now - +d) / (1000 * 60 * 60 * 24));
      if (diff >= 0 && diff < 7) {
        counts[6 - diff] += 1; // align to labels from oldest to newest
      }
    }
    return counts;
  }, [metrics]);

  const barData =
    metrics && metrics.top5
      ? metrics.top5.map((p: any) => ({ label: p.nome, value: p.quantidade }))
      : [];
  const donutParts =
    metrics && metrics.dist_by_type
      ? metrics.dist_by_type.map((d: any, i: number) => ({
          label: d.tipo || "Outros",
          value: d.cnt,
          color: ["var(--brand)", "var(--blue)", "var(--success)", "#ffc107"][
            i % 4
          ],
        }))
      : [];

  const m = metrics || {};

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <h1>Dashboard Estratégico</h1>
        <button className={styles.back} onClick={() => router.push("/painel")}>
          ← Voltar ao Painel
        </button>
      </div>

      <p className={styles.lead}>
        Visão geral rápida do desempenho das suas peças e controle de estoque.
      </p>

      {loading ? (
        <div className={styles.loading}>Carregando métricas...</div>
      ) : error ? (
        <div className={styles.error}>
          Erro ao carregar métricas: {String(error)}
        </div>
      ) : (
        <>
          <div className={styles.grid}>
            <div className={styles.card}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <svg
                  width="36"
                  height="36"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <rect
                    x="3"
                    y="4"
                    width="18"
                    height="16"
                    rx="2"
                    fill="var(--brand)"
                  />
                </svg>
                <div>
                  <h3 style={{ margin: 0 }}>Total de Peças</h3>
                  <small className={styles.hint}>
                    Número total de itens cadastrados
                  </small>
                </div>
              </div>
              <p className={styles.stat}>{metrics.total ?? 0}</p>
            </div>

            <div className={styles.card}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <svg
                  width="36"
                  height="36"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <circle cx="12" cy="12" r="10" fill="var(--danger)" />
                </svg>
                <div>
                  <h3 style={{ margin: 0 }}>Peças com Estoque Baixo</h3>
                  <small className={styles.hint}>
                    Itens abaixo do estoque mínimo
                  </small>
                </div>
              </div>
              <p className={styles.stat}>{metrics.low_stock ?? 0}</p>
            </div>

            <div className={styles.card}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <svg
                  width="36"
                  height="36"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M2 12s4-8 10-8 10 8 10 8-4 8-10 8S2 12 2 12z"
                    fill="var(--blue)"
                  />
                </svg>
                <div>
                  <h3 style={{ margin: 0 }}>Visualizações/Interesse</h3>
                  <small className={styles.hint}>
                    Indicador de acessos e interesse nas peças
                  </small>
                </div>
              </div>
              <p className={styles.stat}>{metrics.total_interesses ?? 0}</p>
            </div>

            <div className={styles.cardWide}>
              <h3>Últimas Movimentações</h3>
              <div className={styles.listPlaceholder}>
                {m.movimentacoes && m.movimentacoes.length ? (
                  <ul className={styles.movList}>
                    {m.movimentacoes.map((mv: any) => (
                      <li key={mv.id}>
                        <strong>{mv.nome_produto}</strong> —{" "}
                        {mv.tipo_movimentacao}{" "}
                        <span className={styles.small}>
                          ({mv.quantidade_movimentada})
                        </span>
                        <div className={styles.mutime}>
                          {new Date(mv.data_movimentacao).toLocaleString()}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>Nenhuma movimentação recente.</p>
                )}
              </div>
            </div>
          </div>

          <div className={styles.footerNote}>
            <small>
              Dados carregados do servidor — atualize a página para refazer a
              consulta.
            </small>
          </div>

          <div className={styles.chartsRow}>
            <div className={styles.chartCard}>
              <h3>Top 5 peças - Estoque</h3>
              <BarChart data={barData} />
            </div>

            <div className={styles.chartCard}>
              <h3>Movimentações nas últimas 7 dias</h3>
              <LineChart data={movimentacoesSeries} labels={last7Labels} />
            </div>
          </div>

          <div className={styles.kpiRow}>
            <div className={styles.kpiCard}>
              <div className={styles.kpiHeader}>
                <strong>Vendas / Saídas</strong>
                <small> (7d)</small>
              </div>
              <div className={styles.kpiValue}>
                {m.movimentacoes
                  ? m.movimentacoes.filter(
                      (mv: any) =>
                        mv.tipo_movimentacao &&
                        mv.tipo_movimentacao.toLowerCase().includes("saida")
                    ).length
                  : 0}
              </div>
              <Sparkline data={movimentacoesSeries} />
            </div>

            <div className={styles.kpiCard}>
              <div className={styles.kpiHeader}>
                <strong>Entradas</strong>
                <small> (7d)</small>
              </div>
              <div className={styles.kpiValue}>
                {m.movimentacoes
                  ? m.movimentacoes.filter(
                      (mv: any) =>
                        mv.tipo_movimentacao &&
                        mv.tipo_movimentacao.toLowerCase().includes("entrada")
                    ).length
                  : 0}
              </div>
              <Sparkline
                data={movimentacoesSeries}
                color="var(--green, #28a745)"
              />
            </div>

            <div className={styles.kpiCard}>
              <div className={styles.kpiHeader}>
                <strong>Taxa de Interesse</strong>
                <small> (7d)</small>
              </div>
              <div className={styles.kpiValue}>
                {metrics.total_interesses
                  ? `${Math.round(
                      (metrics.total_interesses / Math.max(1, metrics.total)) *
                        100
                    )}%`
                  : "—"}
              </div>
              <Sparkline data={movimentacoesSeries} />
            </div>

            <div className={styles.kpiCardDonut}>
              <div className={styles.kpiHeader}>
                <strong>Distribuição por Tipo</strong>
              </div>
              <DonutChart parts={donutParts} />
            </div>
          </div>

          <div className={styles.lowStockSection}>
            <h3>Peças com Estoque Crítico</h3>
            <table className={styles.lowStockTable}>
              <thead>
                <tr>
                  <th>Peça</th>
                  <th>Quantidade</th>
                  <th>Mínimo</th>
                  <th>Ação</th>
                </tr>
              </thead>
              <tbody>
                {m.low_list && m.low_list.length ? (
                  m.low_list.map((r: any) => (
                    <tr key={r.id}>
                      <td>{r.nome}</td>
                      <td>{r.quantidade}</td>
                      <td>{r.quantidade_minima ?? "-"}</td>
                      <td>
                        <button
                          onClick={() => router.push(`/produto/${r.id}`)}
                          className={styles.smallBtn}
                        >
                          Ver
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4}>Nenhuma peça crítica encontrada.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
