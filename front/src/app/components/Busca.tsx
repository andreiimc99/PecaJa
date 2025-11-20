"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image"; // Migrando imagens para next/image
import Link from "next/link";
import { FaFilter, FaHeart, FaSearch, FaStore, FaTag } from "react-icons/fa";
import "./Busca.css";
import storage from "../lib/storage";

interface Item {
  id: number;
  nome: string;
  tipo: string;
  marca: string;
  nome_desmanche: string;
  preco?: number;
  quantidade?: number;
  descricao?: string;
  foto_url?: string;
}

interface BuscaProps {
  termoInicial: string;
  dados: Item[];
}

const Busca: React.FC<BuscaProps> = ({ termoInicial, dados }) => {
  const [termo, setTermo] = useState<string>(termoInicial || "");
  const [tipo, setTipo] = useState<string>("Todos");
  const [marca, setMarca] = useState<string>("Todas");
  const [favoritos, setFavoritos] = useState<Set<number>>(() => {
    const arr = storage.getJSON<number[]>("favoritos") || [];
    return new Set(arr);
  });

  useEffect(() => {
    storage.setJSON("favoritos", Array.from(favoritos));
  }, [favoritos]);

  const tiposUnicos = useMemo(() => {
    const set = new Set<string>();
    dados.forEach((d) => d.tipo && set.add(d.tipo));
    return ["Todos", ...Array.from(set)];
  }, [dados]);

  const marcasUnicas = useMemo(() => {
    const set = new Set<string>();
    dados.forEach((d) => d.marca && set.add(d.marca));
    return ["Todas", ...Array.from(set)];
  }, [dados]);

  const filtrados = useMemo(() => {
    const busca = termo.trim().toLowerCase();
    return dados.filter((item) => {
      const matchTermo =
        !busca ||
        item.nome.toLowerCase().includes(busca) ||
        (item.descricao || "").toLowerCase().includes(busca) ||
        item.marca.toLowerCase().includes(busca);
      const matchTipo = tipo === "Todos" || item.tipo === tipo;
      const matchMarca = marca === "Todas" || item.marca === marca;
      return matchTermo && matchTipo && matchMarca;
    });
  }, [dados, termo, tipo, marca]);

  function limparFiltros() {
    setTermo("");
    setTipo("Todos");
    setMarca("Todas");
  }

  function handleFavoritar(e: React.MouseEvent<HTMLButtonElement>, id: number) {
    e.preventDefault();
    e.stopPropagation();
    setFavoritos((prev) => {
      const novo = new Set(prev);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  }

  return (
    <div className="busca-page">
      <div className="busca-header">
        <div className="busca-header-content">
          <h1 className="busca-title">
            <FaSearch />
            Buscar peças
          </h1>
          <p className="busca-subtitle">
            Encontre a peça perfeita para o seu veículo em nosso catálogo
          </p>
        </div>
      </div>

      <div className="busca-container">
        <div className="busca-content">
          {/* Sidebar de filtros */}
          <aside className="busca-filters-section">
            <div className="busca-filters-header">
              <FaFilter className="filter-icon" />
              <span>Filtros</span>
            </div>

            <div className="busca-controls">
              <div className="busca-filter-group">
                <label className="filter-label">
                  <FaTag className="label-icon" />
                  Tipo
                </label>
                <select
                  className="busca-select"
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value)}
                >
                  {tiposUnicos.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div className="busca-filter-group">
                <label className="filter-label">
                  <FaStore className="label-icon" />
                  Marca
                </label>
                <select
                  className="busca-select"
                  value={marca}
                  onChange={(e) => setMarca(e.target.value)}
                >
                  {marcasUnicas.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              {(termo || tipo !== "Todos" || marca !== "Todas") && (
                <button className="btn-limpar-filtros" onClick={limparFiltros}>
                  Limpar filtros
                </button>
              )}
            </div>
          </aside>

          {/* Resultados */}
          <section className="busca-resultados">
            <div className="busca-search-section">
              <div className="busca-input-wrapper">
                <FaSearch className="busca-input-icon" />
                <input
                  className="busca-input"
                  type="text"
                  placeholder="Busque por nome, descrição ou marca"
                  value={termo}
                  onChange={(e) => setTermo(e.target.value)}
                />
              </div>
            </div>

            <div className="busca-resultados-header">
              <div className="busca-resultados-count">
                {filtrados.length} resultado{filtrados.length !== 1 ? "s" : ""}
              </div>
              <div className="filtros-ativos-tags">
                {termo && <span className="filter-tag">Termo: {termo}</span>}
                {tipo !== "Todos" && (
                  <span className="filter-tag">Tipo: {tipo}</span>
                )}
                {marca !== "Todas" && (
                  <span className="filter-tag">Marca: {marca}</span>
                )}
              </div>
            </div>

            {filtrados.length > 0 ? (
              <div className="busca-resultados-grid">
                {filtrados.map((item) => (
                  <Link
                    href={`/peca/${item.id}`}
                    key={item.id}
                    className="resultado-link"
                  >
                    <div className="busca-resultado-card">
                      <div className="card-image-wrapper">
                        {item.foto_url ? (
                          <Image
                            src={item.foto_url}
                            alt={item.nome}
                            className="card-image"
                            // Define dimensões base; wrapper força fill visual via CSS.
                            width={400}
                            height={300}
                          />
                        ) : (
                          <div className="card-image-placeholder">
                            <FaTag size={48} color="#cbd5e1" />
                          </div>
                        )}
                        <button
                          className={`btn-favoritar-card ${
                            favoritos.has(item.id) ? "favoritado" : ""
                          }`}
                          onClick={(e) => handleFavoritar(e, item.id)}
                          title={
                            favoritos.has(item.id)
                              ? "Remover dos favoritos"
                              : "Adicionar aos favoritos"
                          }
                        >
                          <FaHeart />
                        </button>
                      </div>

                      <div className="card-content">
                        <h3 className="card-title">{item.nome}</h3>

                        <div className="card-info">
                          <span className="card-badge tipo">{item.tipo}</span>
                          <span className="card-badge marca">{item.marca}</span>
                        </div>

                        <div className="card-desmanche">
                          <FaStore size={14} />
                          <span>{item.nome_desmanche}</span>
                        </div>

                        {item.preco !== undefined && (
                          <div className="card-preco">
                            R${" "}
                            {new Intl.NumberFormat("pt-BR", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            }).format(item.preco)}
                          </div>
                        )}

                        {item.quantidade !== undefined && (
                          <div className="card-estoque">
                            <span
                              className={
                                item.quantidade > 0
                                  ? "disponivel"
                                  : "indisponivel"
                              }
                            >
                              {item.quantidade > 0
                                ? `${item.quantidade} em estoque`
                                : "Indisponível"}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="busca-nada-encontrado">
                <FaSearch size={48} color="#cbd5e1" />
                <h3>Nenhuma peça encontrada</h3>
                <p>Tente ajustar os filtros ou buscar por outro termo</p>
                {(termo || tipo !== "Todos" || marca !== "Todas") && (
                  <button
                    className="btn-limpar-resultados"
                    onClick={limparFiltros}
                  >
                    Limpar todos os filtros
                  </button>
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default Busca;
