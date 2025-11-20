"use client";

import React, { useState, useEffect, ChangeEvent, FormEvent } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import "./painel-cliente.css";
import storage from "../lib/storage";

interface Cliente {
  id: number;
  nome: string;
  sobrenome: string;
  CPF: string;
  email: string;
  telefone: string | null;
  foto_url?: string | null;
}

export default function PainelCliente() {
  const router = useRouter();
  const [formData, setFormData] = useState<Cliente>({
    id: 0,
    nome: "",
    sobrenome: "",
    CPF: "",
    email: "",
    telefone: "",
  });
  const [foto, setFoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState<string>("");

  useEffect(() => {
    const uObj = storage.getJSON<{ id: number }>("usuario");
    const token = storage.get("token");
    if (!uObj || !token) {
      router.push("/login");
      return;
    }
    const { id } = uObj;
    fetch(`http://localhost:3001/api/clientes/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Erro ao carregar perfil.");
        return res.json();
      })
      .then((dados: Cliente) => {
        setFormData(dados);
        if (dados.foto_url) setPreview(dados.foto_url);
      })
      .catch(() => {
        alert("Erro ao carregar perfil.");
        router.push("/");
      });
  }, [router]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const token = storage.get("token");
    try {
      const fd = new FormData();
      fd.append("nome", formData.nome);
      fd.append("sobrenome", formData.sobrenome);
      fd.append("CPF", formData.CPF);
      fd.append("email", formData.email);
      if (formData.telefone) fd.append("telefone", formData.telefone);
      if (foto) fd.append("foto_url", foto);

      const res = await fetch(
        `http://localhost:3001/api/clientes/${formData.id}`,
        {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}` },
          body: fd,
        }
      );
      const ct = res.headers.get("content-type") || "";
      let body: unknown;
      if (ct.includes("application/json")) {
        body = await res.json();
      } else {
        const text = await res.text();
        throw new Error(
          `Resposta inesperada (conteúdo não JSON): ${text.slice(0, 120)}`
        );
      }
      if (!res.ok) {
        const errorMsg =
          (body as { error?: string }).error || "Erro ao salvar.";
        throw new Error(errorMsg);
      }
      setMensagem("Perfil atualizado com sucesso!");
      const nova = (body as { novaFotoUrl?: string }).novaFotoUrl;
      if (nova) setPreview(nova);
      // Atualiza nome no header preservando a role existente (não sobrescrever admin)
      try {
        const existing = storage.getJSON<any>("usuario") || {};
        const merged = { ...existing, id: formData.id, nome: formData.nome };
        // Se não houver role vindo do backend nem já existente, assume 'cliente'
        if (!merged.role) merged.role = "cliente";
        storage.setJSON("usuario", merged);
      } catch {
        // fallback conservador
        storage.setJSON("usuario", { id: formData.id, nome: formData.nome, role: "cliente" });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(msg);
    }
  };

  return (
    <div className="painel-cliente-container">
      <h1>Meu Perfil</h1>
      <button className="botao-voltar" onClick={() => router.push("/")}>
        ← Voltar
      </button>

      <form className="form-cliente" onSubmit={handleSubmit}>
        {preview ? (
          <Image
            src={preview}
            alt="Foto de perfil"
            width={128}
            height={128}
            style={{ borderRadius: 64, objectFit: "cover", marginBottom: 12 }}
            priority
          />
        ) : null}
        <div className="campo">
          <label>Foto de Perfil</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const f = e.target.files?.[0] || null;
              setFoto(f);
              if (f) setPreview(URL.createObjectURL(f));
            }}
          />
        </div>
        <div className="campo">
          <label>CPF</label>
          <input name="CPF" value={formData.CPF} readOnly />
        </div>
        <div className="campo">
          <label>Nome</label>
          <input
            name="nome"
            value={formData.nome}
            onChange={handleChange}
            required
          />
        </div>
        <div className="campo">
          <label>Sobrenome</label>
          <input
            name="sobrenome"
            value={formData.sobrenome}
            onChange={handleChange}
            required
          />
        </div>
        <div className="campo">
          <label>E-mail</label>
          <input
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            required
          />
        </div>
        <div className="campo">
          <label>Telefone</label>
          <input
            name="telefone"
            value={formData.telefone || ""}
            onChange={handleChange}
          />
        </div>

        <div className="botoes">
          <button type="submit" className="botao-salvar">
            Salvar alterações
          </button>
          {mensagem && <p className="mensagem-sucesso">{mensagem}</p>}
        </div>
      </form>
    </div>
  );
}
