"use client";

import React, { useEffect, useState, ChangeEvent, FormEvent } from "react";
import { useRouter } from "next/navigation";
import "../../painel-cliente/painel-cliente.css";
import { apiUrl } from "../../lib/api-base";

interface Cliente {
  id: number;
  nome: string;
  sobrenome: string;
  email: string;
  telefone: string;
  cpf: string;
}

export default function PainelClientePage() {
  const router = useRouter();
  const [form, setForm] = useState<Cliente>({
    id: 0,
    nome: "",
    sobrenome: "",
    email: "",
    telefone: "",
    cpf: "",
  });
  const [msg, setMsg] = useState("");

  // 1) Ao montar, busca o 'usuario' no localStorage, redireciona ao login se faltar.
  // 2) GET /api/clientes/:id para preencher o formulário.
  useEffect(() => {
    const u = localStorage.getItem("usuario");
    const token = localStorage.getItem("token");
    if (!u || !token) {
      router.push("/login");
      return;
    }
    const { id } = JSON.parse(u);
    fetch(apiUrl(`/api/clientes/${id}`), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((dados: Cliente) => setForm(dados))
      .catch(() => setMsg("Erro ao carregar perfil."));
  }, [router]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setMsg("");
    const token = localStorage.getItem("token") || "";
    try {
      const res = await fetch(apiUrl(`/api/clientes/${form.id}`), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          nome: form.nome,
          sobrenome: form.sobrenome,
          email: form.email,
          telefone: form.telefone,
          // CPF não envia, pois é somente leitura
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Erro ao salvar");
      setMsg("Atualizado com sucesso!");
      // opcional: atualizar nome no navbar
      localStorage.setItem(
        "usuario",
        JSON.stringify({ id: form.id, nome: form.nome, role: "cliente" })
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setMsg(msg);
    }
  };

  return (
    <div className="painel-cliente-container">
      <h1>Meu Perfil</h1>
      <button className="btn voltar" onClick={() => router.push("/")}>
        ← Voltar
      </button>

      <form className="form-cliente" onSubmit={handleSubmit}>
        <div className="campo">
          <label>CPF</label>
          <input name="cpf" value={form.cpf} readOnly className="read-only" />
        </div>
        <div className="campo">
          <label>Nome</label>
          <input
            name="nome"
            value={form.nome}
            onChange={handleChange}
            required
          />
        </div>
        <div className="campo">
          <label>Sobrenome</label>
          <input
            name="sobrenome"
            value={form.sobrenome}
            onChange={handleChange}
            required
          />
        </div>
        <div className="campo">
          <label>E-mail</label>
          <input
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            required
          />
        </div>
        <div className="campo">
          <label>Telefone</label>
          <input
            name="telefone"
            value={form.telefone}
            onChange={handleChange}
          />
        </div>

        <button type="submit" className="btn salvar">
          Salvar Alterações
        </button>
        {msg && <p className="msg">{msg}</p>}
      </form>
    </div>
  );
}
