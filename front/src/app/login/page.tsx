"use client";

import React, { useState } from "react";
import Image from "next/image"; // Migrando <img> para <Image>
import { useRouter } from "next/navigation";
import "./login.css"; // O CSS que vamos criar a seguir
import storage from "../lib/storage";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro("");

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, senha }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Credenciais inválidas.");
      }

      storage.set("token", data.token);
      storage.setJSON("usuario", data.user);
      window.dispatchEvent(new Event("login"));

      // Redireciona com base na role do usuário
      if (data.user.role === "admin") {
        router.push("/painel/admin");
      } else if (data.user.role === "desmanche") {
        router.push("/perfil-desmanche");
      } else {
        router.push("/");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErro(msg);
    }
  };

  return (
    // Container principal que ocupa a tela toda
    <div className="login-container">
      {/* Container do conteúdo centralizado (cartão branco) */}
      <div className="content-container">
        {/* Coluna da Imagem (Esquerda) */}
        <div className="image-container">
          {/* Você pode usar a mesma imagem do cadastro ou uma específica para login */}
          <Image
            src="/logo.png"
            alt="Login"
            width={300}
            height={300}
            className="side-image"
            priority
          />
        </div>

        {/* Coluna do Formulário (Direita) */}
        <div className="form-container">
          <h1 className="login-title">Entrar na Plataforma</h1>
          <form className="login-form" onSubmit={handleLogin}>
            <div className="form-group">
              <label htmlFor="email">E-mail</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                className="login-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="senha">Senha</label>
              <input
                id="senha"
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="••••••••"
                required
                className="login-input"
              />
            </div>

            <button type="submit" className="login-button">
              Entrar
            </button>
            {erro && <p className="login-error">{erro}</p>}
          </form>
          <p className="login-footer">
            Não tem uma conta? <a href="/cadastro">Cadastre-se agora</a>
          </p>
        </div>
      </div>
    </div>
  );
}
