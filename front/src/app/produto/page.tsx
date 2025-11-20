// src/app/produto/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { FaHeart } from "react-icons/fa";
import ImportModal from "../components/ImportModal";
import styles from "./produtodetalhe.module.css";
import storage from "@/app/lib/storage";
import { apiUrl } from "@/app/lib/api-base";

interface Peca {
  id: number;
  nome: string;
  descricao: string;
  preco: number | string;
  quantidade: number;
  quantidade_minima?: number;
  marca: string;
  modelo: string;
  ano: string;
  tipo: string;
  foto_url: string;
  // Campo retornado pelo backend quando filtrado por desmanche_id
  total_favoritos?: number;
  // Mantém compatibilidade caso exista legado
  interesses_count?: number;
}

export default function ProdutoDetalhe() {
  const [pecas, setPecas] = useState<Peca[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  // Estados para melhorar o design/UX da listagem
  const [search, setSearch] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [sortBy, setSortBy] = useState<"nome" | "preco" | "quantidade">("nome");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [showOnlyFavoritos, setShowOnlyFavoritos] = useState(false); // novo filtro
  const usuario = storage.getJSON<{ id: number; role?: string }>("usuario");
  const router = useRouter();

  const fetchPecas = async () => {
    const usuario = storage.getJSON<{ id: number }>("usuario");
    const token = storage.get("token") ?? "";
    if (!usuario || !token) {
      alert("Usuário não autenticado.");
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(
        apiUrl(`/api/pecas?desmanche_id=${usuario.id}`),
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      );
      if (!res.ok) {
        if (res.status === 401) {
          alert("Sessão expirada ou não autorizada. Faça login novamente.");
        }
        throw new Error(`Erro ao carregar peças: status ${res.status}`);
      }
      const data = await res.json();
      setPecas(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      alert("Erro ao carregar detalhes das peças.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPecas();
  }, []);

  // Hooks derivados DEVEM ficar antes de qualquer retorno condicional
  const tiposUnicos = React.useMemo(() => {
    return Array.from(new Set(pecas.map((p) => p.tipo).filter(Boolean))).sort();
  }, [pecas]);

  const pecasFiltradas = React.useMemo(() => {
    const nf = new Intl.Collator("pt-BR");
    const busca = search.trim().toLowerCase();

    const lista = pecas.filter((p) => {
      const dentroDoTipo = !filtroTipo || p.tipo === filtroTipo;
      const passaFavorito = !showOnlyFavoritos || (p.total_favoritos ?? 0) > 0;
      if (!busca) return dentroDoTipo && passaFavorito;
      const alvo = [p.nome, p.marca, p.modelo, p.tipo, p.ano, p.descricao]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return dentroDoTipo && passaFavorito && alvo.includes(busca);
    });

    lista.sort((a, b) => {
      if (sortBy === "nome") {
        const cmp = nf.compare(a.nome || "", b.nome || "");
        return sortDir === "asc" ? cmp : -cmp;
      }
      if (sortBy === "preco") {
        const pa =
          typeof a.preco === "number"
            ? a.preco
            : parseFloat(String(a.preco) || "0") || 0;
        const pb =
          typeof b.preco === "number"
            ? b.preco
            : parseFloat(String(b.preco) || "0") || 0;
        return sortDir === "asc" ? pa - pb : pb - pa;
      }
      // quantidade
      return sortDir === "asc"
        ? a.quantidade - b.quantidade
        : b.quantidade - a.quantidade;
    });

    return lista;
  }, [pecas, search, filtroTipo, sortBy, sortDir, showOnlyFavoritos]);

  const total = pecas.length;
  const exibidas = pecasFiltradas.length;

  const handleAtualizarQuantidade = async (
    pecaId: number,
    quantidadeAtual: number,
    tipo: "aumentar" | "diminuir"
  ) => {
    const novaQuantidade =
      tipo === "aumentar" ? quantidadeAtual + 1 : quantidadeAtual - 1;

    if (novaQuantidade < 0) {
      return;
    }

    const token = storage.get("token") ?? "";
    if (!token) {
      alert("Você precisa estar logado.");
      return;
    }

    try {
      const res = await fetch(apiUrl(`/api/pecas/${pecaId}`), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ quantidade: novaQuantidade }),
      });

      if (!res.ok) {
        throw new Error(`Erro ao atualizar a quantidade: status ${res.status}`);
      }

      setPecas((prevPecas) =>
        prevPecas.map((p) =>
          p.id === pecaId ? { ...p, quantidade: novaQuantidade } : p
        )
      );
    } catch (err) {
      console.error(err);
      alert("Não foi possível atualizar a quantidade da peça.");
    }
  };

  const handleRemovePeca = async (pecaId: number) => {
    if (!window.confirm("Tem certeza que deseja remover esta peça?")) {
      return;
    }

    const token = storage.get("token") ?? "";
    if (!token) {
      alert("Você precisa estar logado para remover peças.");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(apiUrl(`/api/pecas/${pecaId}`), {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        if (res.status === 401) {
          alert("Sessão expirada ou não autorizada. Faça login novamente.");
        }
        throw new Error(`Erro ao remover peça: status ${res.status}`);
      }

      setPecas((prevPecas) => prevPecas.filter((peca) => peca.id !== pecaId));
      alert("Peça removida com sucesso!");
    } catch (err) {
      console.error(err);
      alert("Não foi possível remover a peça.");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Ajustado: agora gera template vazio (sem dados)
  const handleExportarTemplate = () => {
    const token = storage.get("token") ?? "";
    if (!token) {
      alert("Você precisa estar logado para baixar o template.");
      return;
    }

    setLoading(true);

    fetch(apiUrl(`/api/pecas/exportar?template=true`), {
      // 👈 Adicionado ?template=true
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (!res.ok) {
          return res.text().then((text) => {
            throw new Error(`Erro: ${text}`);
          });
        }
        return res.blob();
      })
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `template_pecas_vazias.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        alert(
          "Template vazio baixado. Preencha os dados e siga para o Passo 2 no modal."
        );
      })
      .catch((err) => {
        console.error(err);
        alert(`Falha ao exportar template: ${err.message}`);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const handleImportarPecas = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const token = storage.get("token") ?? "";
    if (!token) {
      alert("Usuário não autenticado.");
      event.target.value = "";
      return;
    }

    const formData = new FormData();
    formData.append("arquivo_csv", file);

    setLoading(true);

    fetch(apiUrl(`/api/pecas/importar`), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          throw new Error(data.error);
        }
        alert(data.message || "Importação enviada para processamento.");
        fetchPecas();
        setIsModalOpen(false);
      })
      .catch((err) => {
        console.error(err);
        alert(`Falha ao importar as peças: ${err.message}`);
      })
      .finally(() => {
        setLoading(false);
        event.target.value = "";
      });
  };

  // Novo: exporta os produtos atuais como CSV realizando fetch com Authorization
  const handleExportarRelatorio = async () => {
    const token = storage.get("token") ?? "";
    if (!token) return alert("Usuário não autenticado.");

    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/pecas/exportar"), {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Erro ao exportar: ${res.status} ${text}`);
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `produtos_export_${new Date()
        .toISOString()
        .slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : String(err);
      alert(msg || "Falha ao exportar relatório.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    // Mesmo em loading, os hooks acima foram chamados e a ordem permanece estável
    return <p className={styles.loading}>Carregando detalhes da(s) peça(s)…</p>;
  }

  return (
    <div className={styles.produtosLayoutWrapper}>
      <ImportModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onExportTemplate={handleExportarTemplate}
        onImportFile={handleImportarPecas}
        loading={loading}
      />

      <div className={styles.headerContainer}>
        <h2 className={styles.headerContainerH2}>Minhas Peças</h2>
        <div className={styles.headerActions}>
          <button
            className={styles.btnImportar}
            onClick={() => setIsModalOpen(true)}
            disabled={loading}
          >
            Importar Peças (CSV)
          </button>

          <button
            className={styles.btnExportar}
            onClick={() => handleExportarRelatorio()}
            disabled={loading}
          >
            Exportar Relatório (CSV)
          </button>
        </div>
      </div>

      {/* Barra de busca, filtros e ordenação */}
      {total > 0 && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 12,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <input
              type="text"
              placeholder="Buscar por nome, marca, modelo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                padding: "10px 12px",
                borderRadius: 8,
                border: "1px solid #d1d1d1",
                minWidth: 260,
              }}
            />
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              style={{
                padding: "10px 12px",
                borderRadius: 8,
                border: "1px solid #d1d1d1",
              }}
            >
              <option value="">Todos os tipos</option>
              {tiposUnicos.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <select
              value={sortBy}
              onChange={(e) =>
                setSortBy(e.target.value as "nome" | "preco" | "quantidade")
              }
              style={{
                padding: "10px 12px",
                borderRadius: 8,
                border: "1px solid #d1d1d1",
              }}
            >
              <option value="nome">Ordenar por nome</option>
              <option value="preco">Ordenar por preço</option>
              <option value="quantidade">Ordenar por estoque</option>
            </select>
            <button
              onClick={() =>
                setSortDir((prev) => (prev === "asc" ? "desc" : "asc"))
              }
              style={{
                padding: "10px 12px",
                borderRadius: 8,
                border: "1px solid #d1d1d1",
                background: "#fff",
                cursor: "pointer",
                fontWeight: 600,
              }}
              title={
                sortDir === "asc" ? "Ordem crescente" : "Ordem decrescente"
              }
            >
              {sortDir === "asc" ? "A→Z / 0→9" : "Z→A / 9→0"}
            </button>
            {usuario?.role === "cliente" && (
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 14,
                }}
              >
                <input
                  type="checkbox"
                  checked={showOnlyFavoritos}
                  onChange={(e) => setShowOnlyFavoritos(e.target.checked)}
                />
                Somente favoritos
              </label>
            )}
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ color: "#666" }}>
              Exibindo {exibidas} de {total}
            </span>
            <button
              onClick={() => router.push("/cadastropecas")}
              style={{
                padding: "10px 14px",
                borderRadius: 8,
                border: "none",
                background: "var(--brand)",
                color: "#fff",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Cadastrar Peça
            </button>
          </div>
        </div>
      )}

      {pecas.length === 0 ? (
        <div className={styles.noPecasMessageContainer}>
          <h2 className={styles.noPecasMessageContainerH2}>
            Nenhuma Peça Cadastrada
          </h2>
          <p className={styles.noPecasMessageContainerP}>
            Você ainda não cadastrou nenhuma peça. Clique em &quot;Importar
            Peças&quot; para adicionar em massa ou cadastre uma a uma.
          </p>
        </div>
      ) : (
        <>
          {exibidas === 0 ? (
            <div className={styles.noPecasMessageContainer}>
              <h2 className={styles.noPecasMessageContainerH2}>
                Nenhum resultado
              </h2>
              <p className={styles.noPecasMessageContainerP}>
                Ajuste sua busca ou filtros para encontrar as peças desejadas.
              </p>
            </div>
          ) : null}

          <div className={styles.listaPecas}>
            {pecasFiltradas.map((p) => {
              const precoNum =
                typeof p.preco === "number"
                  ? p.preco
                  : parseFloat(String(p.preco) || "0") || 0;
              const lowStock = p.quantidade <= (p.quantidade_minima || 1);
              const precoFormatado = new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
              }).format(precoNum);
              return (
                <div
                  key={p.id}
                  className={`${styles.pecaItem} ${
                    lowStock ? styles.alertaEstoqueBaixo : ""
                  }`}
                >
                  {p.foto_url && (
                    <Image
                      src={p.foto_url}
                      alt={p.nome}
                      className={styles.pecaImagem}
                      width={150}
                      height={150}
                    />
                  )}

                  <div className={styles.pecaInfo}>
                    <div className={styles.pecaTituloRow}>
                      <h3>{p.nome}</h3>
                      {lowStock && (
                        <span
                          className={`${styles.badge} ${styles.badgeLowStock}`}
                        >
                          Baixo estoque
                        </span>
                      )}
                    </div>
                    <p className={styles.pecaDescricao}>{p.descricao}</p>
                    <ul className={styles.pecaAtributos}>
                      <li>
                        <strong>Marca:</strong> {p.marca}
                      </li>
                      <li>
                        <strong>Modelo:</strong> {p.modelo}
                      </li>
                      <li>
                        <strong>Ano:</strong> {p.ano}
                      </li>
                      <li>
                        <strong>Tipo:</strong> {p.tipo}
                      </li>
                      <li>
                        <strong>Preço:</strong> {precoFormatado}
                      </li>
                    </ul>
                    <div className={styles.pecaInteresse}>
                      <FaHeart className={styles.interesseIcone} />
                      {(() => {
                        const favCount =
                          p.total_favoritos ?? p.interesses_count ?? 0;
                        return (
                          <span>
                            {favCount}{" "}
                            {favCount === 1 ? "favorito" : "favoritos"}
                          </span>
                        );
                      })()}
                    </div>
                  </div>

                  <div className={styles.controleEstoque}>
                    <div className={styles.quantidadeControle}>
                      <button
                        className={styles.btnAjusteQtd}
                        onClick={() =>
                          handleAtualizarQuantidade(
                            p.id,
                            p.quantidade,
                            "diminuir"
                          )
                        }
                        disabled={p.quantidade <= 0}
                      >
                        -
                      </button>
                      <span
                        className={`${styles.displayQtd} ${
                          lowStock ? styles.alertaEstoqueBaixo : ""
                        }`}
                      >
                        {p.quantidade}
                      </span>
                      <button
                        className={styles.btnAjusteQtd}
                        onClick={() =>
                          handleAtualizarQuantidade(
                            p.id,
                            p.quantidade,
                            "aumentar"
                          )
                        }
                      >
                        +
                      </button>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px",
                      }}
                    >
                      <button
                        className={styles.btnEditar}
                        onClick={() => router.push(`/cadastropecas?id=${p.id}`)}
                      >
                        Editar
                      </button>

                      <button
                        className={styles.btnRemover}
                        onClick={() => handleRemovePeca(p.id)}
                      >
                        Remover Peça
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
