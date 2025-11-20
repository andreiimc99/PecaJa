"use client";

// Força renderização dinâmica para evitar erros de prerender quando usamos hooks de navegação do cliente
export const dynamic = "force-dynamic";

import React, { useEffect, useState } from "react";
import Busca from "../components/Busca";
// Importa o CSS da Busca no nível da página para garantir que os estilos sejam aplicados
import "../components/Busca.css";
import storage from "../lib/storage";

// AJUSTE: A interface agora inclui o novo campo 'nome_desmanche'.
interface Item {
  id: number;
  nome: string;
  tipo: string;
  marca: string;
  nome_desmanche: string; // Novo campo adicionado
  // Opcional: Adicione outros campos se for usá-los nesta página
  preco?: number;
  quantidade?: number;
  descricao?: string;
  foto_url?: string;
}

export default function PaginaBusca() {
  const [termo, setTermo] = useState("");

  // Lê o parâmetro 'termo' da URL no cliente sem depender de useSearchParams
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      setTermo(params.get("termo") || "");
    } catch {
      setTermo("");
    }
  }, []);

  const [dados, setDados] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPecas() {
      // O token de autenticação precisa ser enviado na requisição
      const token = storage.get("token") ?? "";

      try {
        const response = await fetch("http://localhost:3001/api/pecas", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!response.ok) {
          // Trata erros como token inválido (401) ou outros
          if (response.status === 401) {
            console.error("Não autorizado. Verifique o login e o token.");
          }
          throw new Error("Erro ao buscar peças");
        }

        const pecasDoBackend = await response.json();

        // AJUSTE: Mapeamento direto sem renomear 'tipo' para 'categoria'
        // Agora os dados que chegam do backend são usados diretamente.
        setDados(pecasDoBackend);
      } catch (error) {
        console.error("Erro detalhado ao buscar peças:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchPecas();
  }, []); // A dependência vazia [] faz com que a busca ocorra apenas uma vez.

  if (loading) {
    return <div className="loading-message">Carregando peças...</div>;
  }

  // O componente Busca agora recebe os dados no formato correto (com 'tipo')
  return <Busca termoInicial={termo} dados={dados} />;
}
