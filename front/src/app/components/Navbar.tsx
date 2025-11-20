"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image"; // Substitui <img> por <Image> otimizado
import { FaUserCircle } from "react-icons/fa"; // O import do FaHeart foi removido
import { useRouter } from "next/navigation";
import "./Navbar.css";
import storage from "@/app/lib/storage";

interface Usuario {
  id: number;
  nome: string;
  role: "cliente" | "desmanche" | "admin";
}

export default function Navbar() {
  const [user, setUser] = useState<Usuario | null>(null);
  const router = useRouter();

  useEffect(() => {
    const loadUser = () => {
      const raw = storage.get("usuario");
      if (raw) {
        try {
          setUser(JSON.parse(raw));
        } catch {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    };
    loadUser();
    window.addEventListener("login", loadUser);
    return () => window.removeEventListener("login", loadUser);
  }, []);

  const handleLogout = () => {
    storage.remove("usuario");
    storage.remove("token");
    setUser(null);
    router.push("/");
  };

  return (
    <header className="navbar">
      <div className="logo">
        <Link href="/" aria-label="Página inicial">
          {/* Mantém layout estável especificando largura/altura. Ajuste se o logo tiver dimensões diferentes. */}
          <Image
            src="/logo.png"
            alt="Logo PeçaJá"
            width={120}
            height={40}
            priority
          />
        </Link>
      </div>

      <nav className="nav-controls">
        {user ? (
          <>
            <span className="welcome-text">Olá, {user.nome}</span>

            {/* AJUSTE: Botão de favoritos (cliente) aparece antes do sair */}
            {user.role === "cliente" && (
              <Link href="/favoritos" className="btn favorites-btn">
                Favoritos
              </Link>
            )}

            {user.role === "desmanche" && (
              <button
                onClick={() => router.push("/painel")}
                className="btn painel-btn"
              >
                Painel
              </button>
            )}

            {user.role === "admin" && (
              <Link href="/painel/admin" className="btn painel-btn">
                Painel
              </Link>
            )}

            <button onClick={handleLogout} className="btn logout-btn">
              Sair
            </button>

            {/* Ícone de perfil movido para o final, mantendo Favoritos e Sair lado a lado */}
            <Link
              href={
                user.role === "desmanche"
                  ? `/desmanche/${user.id}`
                  : user.role === "admin"
                  ? "/painel/admin"
                  : "/perfil-cliente"
              }
              title={
                user.role === "desmanche"
                  ? "Ver meu perfil público"
                  : user.role === "admin"
                  ? "Abrir painel administrativo"
                  : "Ver meu perfil"
              }
            >
              <FaUserCircle className="profile-icon" size={28} />
            </Link>
          </>
        ) : (
          <>
            <Link href="/login" className="btn login-btn">
              Entrar
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
