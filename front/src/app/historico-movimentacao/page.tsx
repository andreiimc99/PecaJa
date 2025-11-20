// src/app/historico-movimentacao/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./historico.module.css";
import storage from "../lib/storage";
import { apiUrl } from "../lib/api-base";

// Interface para definir a estrutura de um item do histórico
interface Movimentacao {
  id: number;
  data: string; // dd/MM/yyyy
  produto: string;
  tipo: "Entrada" | "Saída" | "Exclusão";
  quantidade: number;
}

export default function HistoricoPage() {
  const router = useRouter();
  const [historico, setHistorico] = useState<Movimentacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);
  const [total, setTotal] = useState(0);
  // Filtros e paginação
  const [busca, setBusca] = useState("");
  const [tipo, setTipo] = useState<"Todos" | "Entrada" | "Saída" | "Exclusão">(
    "Todos"
  );
  const [dataInicio, setDataInicio] = useState<string>("");
  const [dataFim, setDataFim] = useState<string>("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [lastUrl, setLastUrl] = useState<string>("");
  const [lastStatus, setLastStatus] = useState<number | null>(null);

  useEffect(() => {
    let aborted = false;
    const controller = new AbortController();
    const carregar = async () => {
      setLoading(true);
      setError(null);
      try {
        const token =
          typeof window !== "undefined" ? storage.get("token") : null;
        const headers: Record<string, string> = { Accept: "application/json" };
        if (token) headers.Authorization = `Bearer ${token}`;
        const qs = new URLSearchParams();
        qs.set("page", String(page));
        qs.set("pageSize", String(pageSize));
        if (busca.trim()) qs.set("busca", busca.trim());
        if (tipo !== "Todos") qs.set("tipo", tipo.toLowerCase());
        if (dataInicio) qs.set("de", dataInicio);
        if (dataFim) qs.set("ate", dataFim);
        const finalUrl = apiUrl(`/api/pecas/historico?${qs.toString()}`);
        setLastUrl(finalUrl);
        const res = await fetch(finalUrl, {
          headers,
          signal: controller.signal,
        });
        setLastStatus(res.status);
        if (!res.ok) {
          let friendly = `Erro HTTP ${res.status}`;
          if (res.status === 401)
            friendly = "Não autenticado. Faça login para ver o histórico.";
          else if (res.status === 403)
            friendly =
              "Acesso negado. Entre como desmanche para ver o histórico.";
          else if (res.status === 404)
            friendly =
              "Rota /api/pecas/historico não encontrada no backend (404).";
          throw new Error(friendly);
        }
        const raw = await res.json();
        if (aborted) return;
        const itemsRaw = Array.isArray(raw.items) ? raw.items : raw; // fallback
        const mapped: Movimentacao[] = itemsRaw.map((r: any) => {
          const dt = new Date(r.data_movimentacao);
          const d = String(dt.getDate()).padStart(2, "0");
          const m = String(dt.getMonth() + 1).padStart(2, "0");
          const y = dt.getFullYear();
          let tipoLabel: Movimentacao["tipo"] = "Entrada";
          const rawTipo = (r.tipo_movimentacao || "").toLowerCase();
          if (rawTipo === "saida") tipoLabel = "Saída";
          else if (rawTipo === "exclusao") tipoLabel = "Exclusão";
          return {
            id: r.id,
            data: `${d}/${m}/${y}`,
            produto: r.nome_produto,
            tipo: tipoLabel,
            quantidade: Number(r.quantidade_movimentada) || 0,
          };
        });
        setHistorico(mapped);
        setTotal(typeof raw.total === "number" ? raw.total : mapped.length);
      } catch (err) {
        if ((err as any)?.name === "AbortError") return;
        console.error("Erro ao carregar histórico", err);
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg || "Erro ao carregar histórico");
      } finally {
        if (!aborted) setLoading(false);
      }
    };
    carregar();
    const onLogin = () => carregar();
    const onLogout = () => carregar();
    if (typeof window !== "undefined") {
      window.addEventListener("login", onLogin);
      window.addEventListener("logout", onLogout);
    }
    return () => {
      aborted = true;
      controller.abort();
      if (typeof window !== "undefined") {
        window.removeEventListener("login", onLogin);
        window.removeEventListener("logout", onLogout);
      }
    };
  }, [reloadTick, page, pageSize, busca, tipo, dataInicio, dataFim]);

  // Helpers
  const parsePtDate = (s: string) => {
    // esperado dd/MM/yyyy
    const [d, m, y] = s.split("/").map(Number);
    if (!d || !m || !y) return null;
    return new Date(y, m - 1, d);
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageItems = historico; // já vem paginado

  // Exporta CSV do resultado filtrado
  const handleExport = async () => {
    try {
      const token = typeof window !== "undefined" ? storage.get("token") : null;
      const headers: Record<string, string> = { Accept: "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;
      const qs = new URLSearchParams();
      qs.set("export", "1");
      if (busca.trim()) qs.set("busca", busca.trim());
      if (tipo !== "Todos") qs.set("tipo", tipo.toLowerCase());
      if (dataInicio) qs.set("de", dataInicio);
      if (dataFim) qs.set("ate", dataFim);
      const res = await fetch(
        apiUrl(`/api/pecas/historico?${qs.toString()}`),
        { headers }
      );
      if (!res.ok) throw new Error(`Falha export HTTP ${res.status}`);
      const raw = await res.json();
      const itemsRaw = Array.isArray(raw.items) ? raw.items : raw;
      const mapped: Movimentacao[] = itemsRaw.map((r: any) => {
        const dt = new Date(r.data_movimentacao);
        const d = String(dt.getDate()).padStart(2, "0");
        const m = String(dt.getMonth() + 1).padStart(2, "0");
        const y = dt.getFullYear();
        let tipoLabel: Movimentacao["tipo"] = "Entrada";
        const rawTipo = (r.tipo_movimentacao || "").toLowerCase();
        if (rawTipo === "saida") tipoLabel = "Saída";
        else if (rawTipo === "exclusao") tipoLabel = "Exclusão";
        return {
          id: r.id,
          data: `${d}/${m}/${y}`,
          produto: r.nome_produto,
          tipo: tipoLabel,
          quantidade: Number(r.quantidade_movimentada) || 0,
        };
      });
      const header = ["Data", "Produto", "Tipo", "Quantidade"];
      const rows = mapped.map((i) => [
        i.data,
        i.produto,
        i.tipo,
        String(i.quantidade),
      ]);
      const csv = [header, ...rows]
        .map((r) =>
          r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")
        )
        .join("\r\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `historico_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Histórico de Movimentação</h1>

      <button
        className={styles.backButton}
        onClick={() => router.push("/painel")}
      >
        ← Voltar ao Painel
      </button>

      {/* Toolbar de filtros/ações */}
      <div className={styles.toolbar}>
        <div className={styles.filtersRow}>
          <input
            className={styles.input}
            type="text"
            placeholder="Buscar por produto ou tipo..."
            value={busca}
            onChange={(e) => {
              setBusca(e.target.value);
              setPage(1);
            }}
          />
          <select
            className={styles.select}
            value={tipo}
            onChange={(e) => {
              setTipo(
                e.target.value as "Todos" | "Entrada" | "Saída" | "Exclusão"
              );
              setPage(1);
            }}
          >
            <option value="Todos">Todos</option>
            <option value="Entrada">Entrada</option>
            <option value="Saída">Saída</option>
            <option value="Exclusão">Exclusão</option>
          </select>
          <div className={styles.dateRange}>
            <label>De</label>
            <input
              className={styles.input}
              type="date"
              value={dataInicio}
              onChange={(e) => {
                setDataInicio(e.target.value);
                setPage(1);
              }}
            />
            <label>Até</label>
            <input
              className={styles.input}
              type="date"
              value={dataFim}
              onChange={(e) => {
                setDataFim(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>
        <div className={styles.actionsRow}>
          <span className={styles.counter}>
            Exibindo {pageItems.length} de {total}
          </span>
          <button
            className={styles.exportBtn}
            onClick={() => setReloadTick((t) => t + 1)}
            disabled={loading}
          >
            {loading ? "Carregando..." : "Recarregar"}
          </button>
          <button className={styles.exportBtn} onClick={handleExport}>
            Exportar CSV
          </button>
        </div>
      </div>

      <div className={styles.tableContainer}>
        {loading ? (
          <p>Carregando histórico...</p>
        ) : error ? (
          <div className={styles.error}>
            <p>Erro: {error}</p>
            {lastUrl && (
              <p style={{ fontSize: 12, opacity: 0.8 }}>
                URL: {lastUrl} {lastStatus !== null && `(status ${lastStatus})`}
              </p>
            )}
          </div>
        ) : total > 0 ? (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Data</th>
                <th>Produto</th>
                <th>Tipo</th>
                <th>Quantidade</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((item) => (
                <tr key={item.id}>
                  <td>{item.data}</td>
                  <td>{item.produto}</td>
                  <td>
                    <span
                      className={`${styles.badge} ${
                        item.tipo === "Entrada"
                          ? styles.entrada
                          : item.tipo === "Saída"
                          ? styles.saida
                          : styles.saida
                      }`}
                    >
                      {item.tipo}
                    </span>
                  </td>
                  <td>{item.quantidade}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>Nenhuma movimentação encontrada.</p>
        )}
      </div>

      {/* Paginação */}
      {!loading && total > 0 && (
        <div className={styles.pagination}>
          <button
            className={styles.pageBtn}
            disabled={currentPage === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Anterior
          </button>
          <span className={styles.pageInfo}>
            Página {currentPage} de {totalPages}
          </span>
          <button
            className={styles.pageBtn}
            disabled={currentPage === totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Próxima
          </button>
          <select
            className={styles.pageSize}
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
        </div>
      )}
    </div>
  );
}
