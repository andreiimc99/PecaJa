"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import {
  FaStore,
  FaEnvelope,
  FaPhone,
  FaMapMarkerAlt,
  FaClock,
  FaWhatsapp,
  FaWrench,
} from "react-icons/fa";
import FavoriteButton from "@/app/components/FavoriteButton";
import "./DesmanchePerfil.css";
import storage from "../../lib/storage";
import { apiUrl } from "../../lib/api-base";

// ... (Interfaces ItemEstoque e Desmanche permanecem as mesmas) ...
interface ItemEstoque {
  id: number;
  nome: string;
  descricao: string;
  preco: string;
  foto_url?: string;
}

interface Desmanche {
  id: number;
  nome: string;
  email: string;
  endereco: string;
  telefone: string;
  horario: string;
  descricao: string;
  foto_url?: string;
  estoque: ItemEstoque[];
}

export default function PaginaPerfilDesmanche() {
  const params = useParams();
  const router = useRouter();
  const idParam = params.id as string | string[] | undefined;
  const id = Array.isArray(idParam) ? idParam[0] : idParam; // garante string

  const [desmanche, setDesmanche] = useState<Desmanche | null>(null);
  const [loading, setLoading] = useState(true);
  const [fotoExpandida, setFotoExpandida] = useState(false);
  // UI: filtros e ordenação do estoque
  const [busca, setBusca] = useState("");
  const [ordenarPor, setOrdenarPor] = useState<"nome" | "preco">("nome");
  const [ordenarDir, setOrdenarDir] = useState<"asc" | "desc">("asc");

  // 1. INICIALIZAR O ESTADO com os dados do localStorage.
  // Esta função é executada apenas uma vez, na criação do componente.
  const [favoritos, setFavoritos] = useState<Set<number>>(() => {
    const arr = storage.getJSON<number[]>("favoritos_pecas") || [];
    return new Set(arr);
  });

  // 2. SALVAR FAVORITOS no localStorage sempre que o estado 'favoritos' mudar.
  useEffect(() => {
    storage.setJSON("favoritos_pecas", Array.from(favoritos));
  }, [favoritos]);

  const handleFavoritar = (pecaId: number) => {
    setFavoritos((prevFavoritos) => {
      const novosFavoritos = new Set(prevFavoritos);
      if (novosFavoritos.has(pecaId)) {
        novosFavoritos.delete(pecaId);
      } else {
        novosFavoritos.add(pecaId);
      }
      return novosFavoritos;
    });
  };

  useEffect(() => {
    if (!id) return;

    const token = storage.get("token");
    if (!token) {
      // sem token, redireciona para login
      router.push("/login");
      return;
    }

    const fetchDesmanche = async () => {
      try {
        const res = await fetch(
          apiUrl(`/api/desmanches/${encodeURIComponent(id)}`),
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (res.status === 401 || res.status === 403) {
          router.push("/login");
          return;
        }

        if (res.status === 404) {
          setDesmanche(null);
          return;
        }

        if (!res.ok) {
          console.error("Falha ao buscar desmanche:", res.statusText);
          return;
        }

        const data = await res.json();
        setDesmanche(data);
      } catch (err) {
        console.error("Erro ao carregar desmanche:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDesmanche();
  }, [id, router]);

  const getWhatsAppLink = (telefone: string) => {
    if (!telefone) return "#";
    const numeroLimpo = telefone.replace(/\D/g, "");
    return `https://api.whatsapp.com/send?phone=${numeroLimpo}`;
  };

  const getMailLink = (email: string) => (email ? `mailto:${email}` : "#");

  // Lista de estoque filtrada/ordenada
  const estoqueFiltrado = useMemo(() => {
    if (!desmanche || !desmanche.estoque) return [] as ItemEstoque[];
    const q = busca.trim().toLowerCase();
    const list = desmanche.estoque.filter(
      (i) => !q || `${i.nome} ${i.descricao}`.toLowerCase().includes(q)
    );
    list.sort((a, b) => {
      if (ordenarPor === "nome") {
        const cmp = (a.nome || "").localeCompare(b.nome || "", "pt-BR");
        return ordenarDir === "asc" ? cmp : -cmp;
      }
      // preço como número
      const pa =
        parseFloat(
          String(a.preco)
            .replace(/[^0-9,\.]/g, "")
            .replace(",", ".")
        ) || 0;
      const pb =
        parseFloat(
          String(b.preco)
            .replace(/[^0-9,\.]/g, "")
            .replace(",", ".")
        ) || 0;
      return ordenarDir === "asc" ? pa - pb : pb - pa;
    });
    return list;
  }, [desmanche, busca, ordenarPor, ordenarDir]);

  if (loading) return <p className="status-container">Carregando perfil...</p>;
  if (!desmanche)
    return <p className="status-container erro">Perfil não encontrado.</p>;

  return (
    <div className="perfil-pagina">
      {/* Modal de foto expandida */}
      {fotoExpandida && desmanche.foto_url && (
        <div
          className="modal-foto-overlay"
          onClick={() => setFotoExpandida(false)}
        >
          <div className="modal-foto-content">
            <Image
              src={desmanche.foto_url}
              alt={desmanche.nome}
              width={800}
              height={600}
              style={{ width: "100%", height: "auto" }}
            />
            <button
              className="modal-foto-fechar"
              onClick={() => setFotoExpandida(false)}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <div className="perfil-card">
        <div className="perfil-header">
          {desmanche.foto_url ? (
            <Image
              src={desmanche.foto_url}
              alt={desmanche.nome}
              className="perfil-foto-header"
              width={96}
              height={96}
              onClick={() => setFotoExpandida(true)}
              style={{ cursor: "pointer" }}
            />
          ) : (
            <FaStore className="perfil-icone-header" />
          )}
          <div className="perfil-header-content">
            <h1 className="perfil-nome">{desmanche.nome}</h1>
            {desmanche.descricao && (
              <p className="perfil-descricao">{desmanche.descricao}</p>
            )}
          </div>
        </div>
        <div className="perfil-body">
          <div className="perfil-info-card">
            <div className="perfil-info-item">
              <FaMapMarkerAlt className="perfil-info-icone" />
              <span>{desmanche.endereco || "Endereço não informado"}</span>
            </div>
          </div>
          <div className="perfil-info-card">
            <div className="perfil-info-item">
              <FaClock className="perfil-info-icone" />
              <span>{desmanche.horario || "Horário não informado"}</span>
            </div>
          </div>
          <div className="perfil-info-card">
            <div className="perfil-info-item">
              <FaPhone className="perfil-info-icone" />
              <span>{desmanche.telefone || "Telefone não informado"}</span>
            </div>
          </div>
          <div className="perfil-info-card">
            <div className="perfil-info-item">
              <FaEnvelope className="perfil-info-icone" />
              <span>{desmanche.email || "E-mail não informado"}</span>
            </div>
          </div>
          {/* Ações de contato */}
          <div className="perfil-info-card">
            <div className="contato-actions">
              {desmanche.telefone && (
                <a
                  href={getWhatsAppLink(desmanche.telefone)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-acao-contato whatsapp"
                >
                  <FaWhatsapp /> WhatsApp
                </a>
              )}
              {desmanche.email && (
                <a
                  href={getMailLink(desmanche.email)}
                  className="btn-acao-contato email"
                >
                  <FaEnvelope /> E-mail
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="estoque-section">
        <h2 className="estoque-titulo">
          <FaWrench /> Estoque de Peças
        </h2>
        {/* Toolbar de filtros/sort do estoque */}
        <div className="estoque-toolbar">
          <div className="estoque-filtros">
            <input
              className="input"
              type="text"
              placeholder="Buscar peça por nome ou descrição..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
            <select
              className="select"
              value={ordenarPor}
              onChange={(e) =>
                setOrdenarPor(e.target.value as "nome" | "preco")
              }
            >
              <option value="nome">Ordenar por nome</option>
              <option value="preco">Ordenar por preço</option>
            </select>
            <button
              className="select"
              onClick={() =>
                setOrdenarDir((d) => (d === "asc" ? "desc" : "asc"))
              }
            >
              {ordenarDir === "asc" ? "A→Z / 0→9" : "Z→A / 9→0"}
            </button>
          </div>
          <span className="estoque-quantidade">
            {estoqueFiltrado.length} de {desmanche.estoque?.length || 0} peças
          </span>
        </div>
        {desmanche.estoque && desmanche.estoque.length > 0 ? (
          <div className="estoque-lista">
            {estoqueFiltrado.map((item) => {
              const isFavorito = favoritos.has(item.id);
              return (
                <div
                  key={item.id}
                  className="estoque-item-card"
                  onClick={() => router.push(`/peca/${item.id}`)}
                  style={{ cursor: "pointer" }}
                >
                  {item.foto_url && (
                    <Image
                      src={item.foto_url}
                      alt={item.nome}
                      className="estoque-item-imagem"
                      width={120}
                      height={120}
                    />
                  )}
                  <div className="estoque-item-info">
                    <h3 className="estoque-item-nome">{item.nome}</h3>
                    <p className="estoque-item-descricao">{item.descricao}</p>
                    <p className="estoque-item-preco">R$ {item.preco}</p>
                  </div>
                  <FavoriteButton
                    compact
                    active={isFavorito}
                    addLabel={false}
                    onToggle={(e?: any) => {
                      if (e && e.stopPropagation) e.stopPropagation();
                      handleFavoritar(item.id);
                    }}
                    ariaLabelInactive="Favoritar peça"
                    ariaLabelActive="Desfavoritar peça"
                  />
                </div>
              );
            })}
          </div>
        ) : (
          <p className="estoque-vazio-mensagem">
            Nenhuma peça em estoque no momento.
          </p>
        )}
      </div>
    </div>
  );
}
