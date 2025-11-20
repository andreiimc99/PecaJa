// src/app/cadastropecas/page.tsx
"use client";

// Força renderização dinâmica para evitar erros de prerender quando usamos useSearchParams
export const dynamic = "force-dynamic";

import React, { useState, FormEvent, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import "./cadastropecas.css";
import storage from "../lib/storage";

// A interface agora inclui o novo campo `quantidade_minima`.
interface PecaForm {
  nome: string;
  descricao: string;
  preco: string;
  quantidade: string;
  quantidade_minima: string; // Novo campo
  marca: string;
  modelo: string;
  ano: string;
  tipo: string;
}

export default function CadastroPecasPage() {
  const [form, setForm] = useState<PecaForm>({
    nome: "",
    descricao: "",
    preco: "",
    quantidade: "",
    quantidade_minima: "", // Novo estado para o campo
    marca: "",
    modelo: "",
    ano: "",
    tipo: "",
  });

  // Estados para o arquivo da imagem e feedback
  const [arquivoFoto, setArquivoFoto] = useState<File | null>(null);
  const [previewImg, setPreviewImg] = useState<string>("");
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const router = useRouter();
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const id = params.get("id");
      const token = storage.get("token");
      if (!id || !token) return;

      setLoading(true);
      fetch(`http://localhost:3001/api/pecas/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(async (res) => {
          if (!res.ok)
            throw new Error("Não foi possível carregar a peça para edição.");
          return res.json();
        })
        .then((data) => {
          // Preenche o formulário com os dados recebidos
          setForm({
            nome: data.nome || "",
            descricao: data.descricao || "",
            preco: data.preco ? String(data.preco) : "",
            quantidade: data.quantidade ? String(data.quantidade) : "",
            quantidade_minima: data.quantidade_minima
              ? String(data.quantidade_minima)
              : "",
            marca: data.marca || "",
            modelo: data.modelo || "",
            ano: data.ano || "",
            tipo: data.tipo || "",
          });
          setPreviewImg(data.foto_url || "");
          setEditingId(id);
        })
        .catch((err) =>
          setMessage({ type: "error", text: String(err.message) })
        )
        .finally(() => setLoading(false));
    } catch {
      // Falha ao ler searchParams do cliente (ex.: SSR), ignora
    }
  }, []);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setArquivoFoto(file);
    setPreviewImg(URL.createObjectURL(file));
  }

  // Handlers para arrastar-e-soltar na área de upload
  const handleDrop: React.DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) {
      setArquivoFoto(file);
      setPreviewImg(URL.createObjectURL(file));
    }
  };

  const handleDragOver: React.DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  };

  const handleDragLeave: React.DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  };

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    // Usa FormData para enviar o formulário (suporta imagem opcional em edição)
    const dadosFormulario = new FormData();
    dadosFormulario.append("nome", form.nome);
    dadosFormulario.append("descricao", form.descricao);
    dadosFormulario.append("preco", form.preco);
    dadosFormulario.append("quantidade", form.quantidade);
    dadosFormulario.append("quantidade_minima", form.quantidade_minima || "1");
    dadosFormulario.append("marca", form.marca);
    dadosFormulario.append("modelo", form.modelo);
    dadosFormulario.append("ano", form.ano);
    dadosFormulario.append("tipo", form.tipo);
    // Se for edição e o usuário não enviou nova imagem, não anexa foto_url para manter a existente
    if (arquivoFoto) {
      dadosFormulario.append("foto_url", arquivoFoto);
    }

    const token = storage.get("token");
    if (!token) {
      setMessage({
        type: "error",
        text: "Precisa estar logado para cadastrar/editar peças.",
      });
      setLoading(false);
      return;
    }

    try {
      let res;
      if (editingId) {
        // Edição: envia PUT para a rota que aceita multipart (imagem opcional)
        res = await fetch(`http://localhost:3001/api/pecas/${editingId}`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: dadosFormulario,
        });
      } else {
        // Criação
        if (!arquivoFoto) {
          setMessage({
            type: "error",
            text: "A imagem da peça é obrigatória.",
          });
          setLoading(false);
          return;
        }
        res = await fetch("http://localhost:3001/api/pecas", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: dadosFormulario,
        });
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Ocorreu um erro.");
      }

      setMessage({
        type: "success",
        text: editingId
          ? "Peça atualizada com sucesso!"
          : "Peça cadastrada com sucesso!",
      });
      // Limpa o formulário e redireciona de volta para lista
      setForm({
        nome: "",
        descricao: "",
        preco: "",
        quantidade: "",
        quantidade_minima: "",
        marca: "",
        modelo: "",
        ano: "",
        tipo: "",
      });
      setPreviewImg("");
      setArquivoFoto(null);
      const fileInput = document.getElementById(
        "file-input"
      ) as HTMLInputElement;
      if (fileInput) fileInput.value = "";
      // Redireciona direto para a página de detalhes quando for criação
      if (!editingId && data && data.peca && data.peca.id) {
        router.push(`/peca/${data.peca.id}`);
      } else {
        router.push("/produto");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setMessage({ type: "error", text: msg });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="cadastro-pecas-container">
      <h2>Cadastrar Nova Peça</h2>
      <form onSubmit={handleSubmit} className="cadastro-pecas-form">
        {/* Coluna principal de campos */}
        <div className="form-fields">
          <div className="section-card">
            <h3 className="section-title">Informações da Peça</h3>
            <label htmlFor="nome">Nome da peça</label>
            <input
              id="nome"
              name="nome"
              placeholder="Ex.: Parachoque dianteiro"
              value={form.nome}
              onChange={handleChange}
              required
            />

            <label htmlFor="descricao">Descrição</label>
            <textarea
              id="descricao"
              name="descricao"
              placeholder="Detalhes, estado, compatibilidades..."
              value={form.descricao}
              onChange={handleChange}
              required
            />
          </div>

          <div className="section-card">
            <h3 className="section-title">Detalhes e Estoque</h3>
            <div className="fields-grid">
              <div>
                <label htmlFor="marca">Marca</label>
                <input
                  id="marca"
                  name="marca"
                  placeholder="Ex.: Volkswagen"
                  value={form.marca}
                  onChange={handleChange}
                  required
                />
              </div>
              <div>
                <label htmlFor="modelo">Modelo</label>
                <input
                  id="modelo"
                  name="modelo"
                  placeholder="Ex.: Gol"
                  value={form.modelo}
                  onChange={handleChange}
                  required
                />
              </div>
              <div>
                <label htmlFor="ano">Ano</label>
                <input
                  id="ano"
                  name="ano"
                  placeholder="Ex.: 2018"
                  value={form.ano}
                  onChange={handleChange}
                  required
                />
              </div>
              <div>
                <label htmlFor="tipo">Tipo de peça</label>
                <input
                  id="tipo"
                  name="tipo"
                  placeholder="Ex.: Lataria"
                  value={form.tipo}
                  onChange={handleChange}
                  required
                />
              </div>
              <div>
                <label htmlFor="preco">Preço</label>
                <div className="input-group">
                  <span className="prefix">R$</span>
                  <input
                    id="preco"
                    name="preco"
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    value={form.preco}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>
              <div>
                <label htmlFor="quantidade">Quantidade</label>
                <input
                  id="quantidade"
                  name="quantidade"
                  type="number"
                  placeholder="Em estoque"
                  value={form.quantidade}
                  onChange={handleChange}
                  required
                />
              </div>
              <div>
                <label htmlFor="quantidade_minima">Estoque mínimo</label>
                <input
                  id="quantidade_minima"
                  name="quantidade_minima"
                  type="number"
                  placeholder="Padrão 1"
                  value={form.quantidade_minima}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Coluna lateral (upload + preview) */}
        <div className="form-side">
          <div className="section-card">
            <h3 className="section-title">Imagem</h3>
            <div
              className={`upload-dropzone ${dragOver ? "dragging" : ""}`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => document.getElementById("file-input")?.click()}
            >
              {previewImg ? (
                <Image
                  src={previewImg}
                  alt="Preview"
                  className="preview-img"
                  width={400}
                  height={300}
                />
              ) : (
                <p>
                  Arraste e solte a imagem aqui ou{" "}
                  <span className="link">clique para enviar</span>
                </p>
              )}
            </div>
            <input
              id="file-input"
              name="foto_url"
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              /* Não usar required em input escondido para evitar o erro
                 "An invalid form control with name='' is not focusable." */
              style={{ display: "none" }}
            />
            {message && (
              <p className={`message ${message.type}`}>{message.text}</p>
            )}
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" disabled={loading}>
            {loading
              ? "Cadastrando..."
              : editingId
              ? "Salvar Alterações"
              : "Cadastrar Peça"}
          </button>
        </div>
      </form>
    </div>
  );
}
