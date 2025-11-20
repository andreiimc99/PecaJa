// src/app/painel/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link"; // AJUSTE: Importado o componente Link
import styles from "./painel.module.css";
import storage from "../lib/storage";

interface Usuario {
  id: number;
  nome: string;
  role: "cliente" | "desmanche";
}

export default function PainelPage() {
  const router = useRouter();
  const [user, setUser] = useState<Usuario | null>(null);

  useEffect(() => {
    const u = storage.getJSON<Usuario>("usuario");
    if (!u || u.role !== "desmanche") {
      router.replace("/login");
      return;
    }
    setUser(u);
  }, [router]);

  if (!user) {
    return null; // ou um spinner
  }

  return (
    <div className={styles.container}>
      <div className={styles.headerRow}>
        <div>
          <h1 className={styles.title}>Painel do Desmanche</h1>
          <p className={styles.subtitle}>
            Bem-vindo, <strong>{user.nome}</strong>
          </p>
        </div>
        <button className={styles.backButton} onClick={() => router.push("/")}>
          ← Voltar
        </button>
      </div>

      <nav className={styles.actionsGrid} aria-label="Ações do painel">
        <Link href="/cadastropecas" className={styles.actionCard}>
          <span className={styles.actionIcon} aria-hidden>
            {/* ícone caixa */}
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M3 7l9 5 9-5-9-5-9 5z" fill="var(--brand)" />
              <path d="M3 7v10l9 5 9-5V7" stroke="#e6e6e6" />
            </svg>
          </span>
          <span className={styles.actionText}>Cadastrar Nova Peça</span>
        </Link>

        <Link href="/produto" className={styles.actionCard}>
          <span className={styles.actionIcon} aria-hidden>
            {/* ícone prateleira */}
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect
                x="3"
                y="4"
                width="18"
                height="4"
                rx="1"
                fill="var(--brand)"
              />
              <rect x="3" y="10" width="18" height="4" rx="1" fill="#ffb089" />
              <rect x="3" y="16" width="18" height="4" rx="1" fill="#ffd2bf" />
            </svg>
          </span>
          <span className={styles.actionText}>Ver Estoque</span>
        </Link>

        <Link href="/painel/dashboard" className={styles.actionCard}>
          <span className={styles.actionIcon} aria-hidden>
            {/* ícone gráfico */}
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect
                x="4"
                y="12"
                width="4"
                height="8"
                rx="1"
                fill="var(--brand)"
              />
              <rect x="10" y="9" width="4" height="11" rx="1" fill="#ffb089" />
              <rect x="16" y="6" width="4" height="14" rx="1" fill="#ffd2bf" />
            </svg>
          </span>
          <span className={styles.actionText}>Dashboard</span>
        </Link>

        {/* O link de edição do carrossel foi removido do painel do desmanche;
            edição do carrossel é feita apenas no painel administrativo. */}

        <Link href="/perfil-desmanche" className={styles.actionCard}>
          <span className={styles.actionIcon} aria-hidden>
            {/* ícone usuário */}
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="12" cy="8" r="4" fill="var(--brand)" />
              <path d="M4 20a8 8 0 0116 0" stroke="#e6e6e6" strokeWidth="2" />
            </svg>
          </span>
          <span className={styles.actionText}>Editar Perfil</span>
        </Link>

        <Link href="/historico-movimentacao" className={styles.actionCard}>
          <span className={styles.actionIcon} aria-hidden>
            {/* ícone relógio */}
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="12" cy="12" r="9" stroke="#e6e6e6" strokeWidth="2" />
              <path d="M12 7v6l4 2" stroke="var(--brand)" strokeWidth="2" />
            </svg>
          </span>
          <span className={styles.actionText}>Histórico de Movimentação</span>
        </Link>

        <Link
          href="/planos"
          className={`${styles.actionCard} ${styles.actionAlt}`}
        >
          <span className={styles.actionIcon} aria-hidden>
            {/* ícone estrela */}
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 3l2.6 5.3 5.9.9-4.3 4.2 1 5.8L12 16.9 6.8 20.2l1-5.8L3.5 9.2l5.9-.9L12 3z"
                fill="#34495e"
              />
            </svg>
          </span>
          <span className={styles.actionText}>Ver Planos</span>
        </Link>
      </nav>
    </div>
  );
}
