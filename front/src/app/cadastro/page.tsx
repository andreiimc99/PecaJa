// frontend/src/app/cadastro/page.tsx
"use client";

import React, { useState, FormEvent, ChangeEvent } from "react";
import Image from "next/image"; // Migrando <img> para <Image>
import { useRouter } from "next/navigation";
import { InputMask } from "@react-input/mask";
import "./cadastro.css";
import { apiUrl } from "../lib/api-base";

export default function CadastroPage() {
  const router = useRouter();
  const [tipoPessoa, setTipoPessoa] = useState<"pf" | "pj">("pf");
  const [form, setForm] = useState({
    nome: "",
    sobrenome: "",
    cpf: "",
    razaoSocial: "",
    cnpj: "",
    email: "",
    senha: "",
    confirmarSenha: "",
    telefone: "",
  });
  const [foto, setFoto] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    if (form.senha !== form.confirmarSenha) {
      setMessage({ type: "error", text: "As senhas não coincidem!" });
      setLoading(false);
      return;
    }

    let body = {};
    let endpoint = "";
    let valid = false;

    // AJUSTE: Lógica para direcionar para a API correta com o corpo correto
    if (tipoPessoa === "pf") {
      endpoint = apiUrl("/api/clientes");
      // Envia via FormData para suportar upload opcional de imagem
      const fd = new FormData();
      fd.append("nome", form.nome);
      fd.append("sobrenome", form.sobrenome);
      fd.append("CPF", form.cpf);
      fd.append("email", form.email);
      fd.append("senha", form.senha);
      if (form.telefone) fd.append("telefone", form.telefone);
      if (foto) fd.append("foto_url", foto); // nome do campo esperado pelo backend
      body = fd;
      if (form.nome && form.cpf && form.email && form.senha) valid = true;
    } else {
      // tipoPessoa === 'pj'
      endpoint = apiUrl("/api/desmanches");
      // Mapeia o campo 'razaoSocial' do formulário para o campo 'nome' que o backend espera
      body = {
        nome: form.razaoSocial,
        cnpj: form.cnpj,
        email: form.email,
        senha: form.senha,
        telefone: form.telefone || null,
      };
      if (form.razaoSocial && form.cnpj && form.email && form.senha)
        valid = true;
    }

    if (!valid) {
      setMessage({
        type: "error",
        text: "Por favor, preencha todos os campos obrigatórios!",
      });
      setLoading(false);
      return;
    }

    try {
      const isFormData =
        typeof FormData !== "undefined" && body instanceof FormData;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: isFormData
          ? undefined
          : { "Content-Type": "application/json" },
        body: isFormData ? (body as FormData) : JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao cadastrar.");

      setMessage({
        type: "success",
        text: "Cadastro realizado com sucesso! Redirecionando para o login...",
      });
      setTimeout(() => router.push("/login"), 2000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setMessage({ type: "error", text: msg });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="cadastro-container">
      <div className="content-container">
        <div className="image-container">
          <Image
            src="/logo.png"
            alt="Cadastro"
            width={350}
            height={350}
            className="side-image"
            priority
          />
        </div>
        <div className="form-container">
          <h2 className="cadastro-title">Crie sua Conta no PeçaJá</h2>
          <form className="cadastro-form" onSubmit={handleSubmit}>
            <div className="tipo-pessoa-selector">
              <label>
                <input
                  type="radio"
                  name="tipo_pessoa"
                  value="pf"
                  checked={tipoPessoa === "pf"}
                  onChange={(e) => setTipoPessoa(e.target.value as "pf" | "pj")}
                />
                <span>Pessoa Física</span>
              </label>
              <label>
                <input
                  type="radio"
                  name="tipo_pessoa"
                  value="pj"
                  checked={tipoPessoa === "pj"}
                  onChange={(e) => setTipoPessoa(e.target.value as "pf" | "pj")}
                />
                <span>Pessoa Jurídica</span>
              </label>
            </div>

            {tipoPessoa === "pf" ? (
              <>
                <div className="form-group">
                  <label className="cadastro-label">Nome</label>
                  <input
                    className="cadastro-input"
                    name="nome"
                    value={form.nome}
                    onChange={handleChange}
                    placeholder="Seu nome"
                  />
                </div>
                <div className="form-group">
                  <label className="cadastro-label">Sobrenome</label>
                  <input
                    className="cadastro-input"
                    name="sobrenome"
                    value={form.sobrenome}
                    onChange={handleChange}
                    placeholder="Seu sobrenome"
                  />
                </div>
                <div className="form-group">
                  <label className="cadastro-label">
                    Foto de Perfil (opcional)
                  </label>
                  <input
                    className="cadastro-input"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setFoto(e.target.files?.[0] ?? null)}
                  />
                </div>
                <div className="form-group">
                  <label className="cadastro-label">CPF</label>
                  <InputMask
                    mask="___.___.___-__"
                    replacement={{ _: /\d/ }}
                    className="cadastro-input"
                    name="cpf"
                    value={form.cpf}
                    onChange={handleChange}
                    placeholder="000.000.000-00"
                  />
                </div>
              </>
            ) : (
              <>
                <div className="form-group">
                  <label className="cadastro-label">Razão Social</label>
                  <input
                    className="cadastro-input"
                    name="razaoSocial"
                    value={form.razaoSocial}
                    onChange={handleChange}
                    placeholder="Nome da sua empresa"
                  />
                </div>
                <div className="form-group">
                  <label className="cadastro-label">CNPJ</label>
                  <InputMask
                    mask="__.___.___/____-__"
                    replacement={{ _: /\d/ }}
                    className="cadastro-input"
                    name="cnpj"
                    value={form.cnpj}
                    onChange={handleChange}
                    placeholder="00.000.000/0001-00"
                  />
                </div>
              </>
            )}

            <div className="form-group">
              <label className="cadastro-label">E-mail</label>
              <input
                className="cadastro-input"
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="seu@email.com"
              />
            </div>
            <div className="form-group">
              <label className="cadastro-label">Senha</label>
              <input
                className="cadastro-input"
                type="password"
                name="senha"
                value={form.senha}
                onChange={handleChange}
                placeholder="Crie uma senha"
              />
            </div>
            <div className="form-group">
              <label className="cadastro-label">Confirmar Senha</label>
              <input
                className="cadastro-input"
                type="password"
                name="confirmarSenha"
                value={form.confirmarSenha}
                onChange={handleChange}
                placeholder="Repita a senha"
              />
            </div>
            <div className="form-group">
              <label className="cadastro-label">Telefone (Opcional)</label>
              <InputMask
                mask="(__) _____-____"
                replacement={{ _: /\d/ }}
                className="cadastro-input"
                name="telefone"
                value={form.telefone}
                onChange={handleChange}
                placeholder="(00) 00000-0000"
              />
            </div>

            {message && (
              <div className={`message ${message.type}`}>{message.text}</div>
            )}
            <button
              type="submit"
              className="cadastro-button"
              disabled={loading}
            >
              {loading ? "Cadastrando..." : "Criar Conta"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
