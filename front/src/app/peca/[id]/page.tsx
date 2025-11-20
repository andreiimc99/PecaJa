// src/app/peca/[id]/page.tsx
"use client";

import React, { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import FavoriteButton from "@/app/components/FavoriteButton";
import "./PecaDetalhe.css";
import storage from "@/app/lib/storage";
import { getStatusFavorito, toggleFavorito } from "@/app/lib/favoritos";

interface Peca {
  id: number;
  nome: string;
  descricao: string;
  preco: number;
  quantidade: number;
  marca: string;
  modelo: string;
  ano: string;
  tipo: string;
  foto_url: string;
  nome_desmanche: string | null;
  desmanche_id: number;
}

export default function PaginaDetalhePeca() {
  const params = useParams();
  const router = useRouter();
  const rawParam = (params as { id?: string | string[] }).id;
  const id = Array.isArray(rawParam) ? rawParam[0] : rawParam || "";

  const [peca, setPeca] = useState<Peca | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFavorited, setIsFavorited] = useState(false); // NOVO: Estado para Favorito

  // Verifica o status de favorito consultando o backend (fallback ao localStorage se necessário)
  const checkIsFavorited = useCallback(async () => {
    const pid = Number(id);
    if (!pid) return setIsFavorited(false);
    try {
      const favorited = await getStatusFavorito(pid);
      setIsFavorited(favorited);
    } catch {
      const favoritos = storage.getJSON<number[]>("favoritos") || [];
      setIsFavorited(favoritos.includes(pid));
    }
  }, [id]);

  // Alterna o favorito usando a API real
  const handleFavorite = async () => {
    const token = storage.get("token");
    const usuarioJSON = storage.get("usuario");

    if (!token || !usuarioJSON) {
      alert("Você precisa estar logado para favoritar peças.");
      router.push("/login");
      return;
    }

    try {
      const { favorited } = await toggleFavorito(Number(id));
      setIsFavorited(favorited);
      alert(
        favorited
          ? "Peça adicionada aos favoritos!"
          : "Peça removida dos favoritos!"
      );
    } catch (error) {
      console.error("Erro ao favoritar/desfavoritar:", error);
      alert("Ocorreu um erro ao processar seu favorito.");
    }
  };

  useEffect(() => {
    if (id) {
      const fetchPeca = async () => {
        const token = storage.get("token");

        // Verifica o estado de favorito
        checkIsFavorited();

        try {
          // 1) Tenta endpoint protegido
          const resPriv = await fetch(`http://localhost:3001/api/pecas/${id}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });

          if (resPriv.ok) {
            const data = await resPriv.json();
            setPeca(data);
            return;
          }

          // 2) Se 401/403/404, tenta endpoint público de fallback
          if ([401, 403, 404].includes(resPriv.status)) {
            const resPub = await fetch(
              `http://localhost:3001/api/pecas/public/${id}`
            );
            if (resPub.ok) {
              const data = await resPub.json();
              // Pode não vir nome_desmanche; garantimos campo nulo
              setPeca({
                ...(data as Omit<Peca, "nome_desmanche">),
                nome_desmanche: (data as Record<string, unknown>)[
                  "nome_desmanche"
                ] as string | null,
              });
              return;
            }
          }

          // 3) Se chegou aqui, reporta o status do endpoint protegido
          const text = await resPriv.text();
          throw new Error(
            `Falha ao carregar peça (status ${resPriv.status}). ${text || ""}`
          );
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          setError(msg);
        } finally {
          setLoading(false);
        }
      };
      fetchPeca();
    }
  }, [id, checkIsFavorited]);

  if (loading) {
    return (
      <div className="status-container">Carregando detalhes da peça...</div>
    );
  }
  if (error || !peca) {
    return (
      <div className="status-container erro">
        {error || "Peça não encontrada."}
      </div>
    );
  }

  return (
    <div className="pagina-container">
      <button onClick={() => router.back()} className="botao-voltar">
        &larr; Voltar
      </button>
      <div className="peca-detalhe-container">
        <div className="imagem-container">
          <Image
            src={peca.foto_url}
            alt={peca.nome}
            className="peca-detalhe-imagem"
            width={600}
            height={600}
          />
        </div>
        <div className="info-container">
          <h1 className="peca-detalhe-titulo">{peca.nome}</h1>
          {peca.nome_desmanche ? (
            <p className="peca-detalhe-desmanche">
              Vendido por:
              {/* Transforma o nome do desmanche em um link para o perfil dele */}
              <Link
                href={`/desmanche/${peca.desmanche_id}`}
                className="link-desmanche"
              >
                <strong>{peca.nome_desmanche}</strong>
              </Link>
            </p>
          ) : null}

          {/* NOVO: Div para agrupar preço e botão de favorito */}
          <div className="acoes-peca">
            <p className="peca-detalhe-preco">
              R$ {Number(peca.preco).toFixed(2)}
            </p>

            {/* NOVO BOTÃO DE FAVORITAR */}
            <FavoriteButton
              active={isFavorited}
              onToggle={handleFavorite}
              inactiveLabel="Adicionar aos Favoritos"
              activeLabel="Desfavoritar"
              ariaLabelInactive="Adicionar peça aos favoritos"
              ariaLabelActive="Remover peça dos favoritos"
            />
          </div>

          <p className="peca-detalhe-info">
            <strong>Descrição:</strong> {peca.descricao}
          </p>
          <p className="peca-detalhe-info">
            <strong>Marca:</strong> {peca.marca}
          </p>
          <p className="peca-detalhe-info">
            <strong>Modelo:</strong> {peca.modelo}
          </p>
          <p className="peca-detalhe-info">
            <strong>Ano:</strong> {peca.ano}
          </p>
          <p className="peca-detalhe-info">
            <strong>Tipo:</strong> {peca.tipo}
          </p>
          <p className="peca-detalhe-info">
            <strong>Em estoque:</strong> {peca.quantidade} unidades
          </p>
        </div>
      </div>
    </div>
  );
}
