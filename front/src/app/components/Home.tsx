"use client";
import React, { useState, useEffect } from "react";
import Image from "next/image"; // Usar imagem otimizada do Next
import { useRouter } from "next/navigation";
import Pesquisa from "../components/Pesquisa";
import Carousel from "../components/Carousel";
import "./Home.css";
import storage from "@/app/lib/storage";

// Interface para os dados do desmanche que virão da API
interface Desmanche {
  id: number;
  nome: string;
  horario: string;
  foto_url: string | null; // A foto pode ser opcional
}

function Home() {
  const [desmanches, setDesmanches] = useState<Desmanche[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [pageCount, setPageCount] = useState(0);
  const router = useRouter();

  // Busca paginada (3 por página) dos desmanches em destaque
  useEffect(() => {
    let cancelled = false;
    async function fetchDesmanchesVitrine() {
      setLoading(true);
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      try {
        const response = await fetch(
          `${apiBase}/api/public/desmanches-vitrine?limit=3&page=${page}`
        );
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        if (cancelled) return;
        if (data && Array.isArray(data.rows)) {
          setDesmanches(data.rows);
          setPage(data.page || 0);
          setPageCount(data.pageCount || 0);
        } else {
          setDesmanches([]);
          setPageCount(0);
        }
      } catch (err) {
        console.error("Erro ao carregar desmanches:", err);
        if (!cancelled) setDesmanches([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchDesmanchesVitrine();
    return () => {
      cancelled = true;
    };
  }, [page]);

  // Função para lidar com o clique no botão "Acessar"
  const handleAcessarClick = (desmancheId: number) => {
    // Verifica se existe um token de login no armazenamento local do navegador
    const token = storage.get("token");

    if (token) {
      // Se o usuário está logado, navega para a página de perfil do desmanche
      router.push(`/desmanche/${desmancheId}`);
    } else {
      // Se não está logado, redireciona para a página de login
      router.push("/login");
    }
  };

  return (
    <div className="home-container">
      <Pesquisa />
      {/* Carrossel dinâmico (banners do backend). O componente já esconde se não houver itens. */}
      <Carousel />
      <div className="desmanches-container">
        {loading ? (
          <p>Carregando desmanches...</p>
        ) : desmanches.length === 0 ? (
          <p style={{ textAlign: "center", color: "#666" }}>
            Nenhum desmanche em destaque no momento.
          </p>
        ) : (
          <>
            <div className="desmanches-grid">
              {desmanches.map((desmanche) => (
                <div key={desmanche.id} className="desmanche-card">
                  <Image
                    // Usa a foto_url vinda do banco ou uma imagem padrão caso não exista
                    src={desmanche.foto_url || "/lupa.png"}
                    alt={desmanche.nome}
                    width={100}
                    height={100}
                    className="desmanche-imagem"
                  />
                  <h3 className="desmanche-nome">{desmanche.nome}</h3>
                  <p className="desmanche-horario">Horário de atendimento</p>
                  <p className="desmanche-horario-detalhe">
                    {desmanche.horario || "Não informado"}
                  </p>
                  <button
                    className="botao-acesso"
                    onClick={() => handleAcessarClick(desmanche.id)}
                  >
                    Acessar
                  </button>
                </div>
              ))}
            </div>

            <div className="desmanches-pager">
              <button
                className="pager-btn"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page <= 0}
              >
                Anterior
              </button>
              <span className="pager-info">Página {page + 1} de {Math.max(1, pageCount)}</span>
              <button
                className="pager-btn"
                onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                disabled={page >= pageCount - 1}
              >
                Próxima
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Home;
