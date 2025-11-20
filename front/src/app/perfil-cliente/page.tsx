"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import "./perfil-cliente.css";
import storage from "../lib/storage";

interface Cliente {
  id: number;
  nome: string;
  sobrenome: string;
  email: string;
  telefone: string | null;
  CPF: string | null;
  foto_url?: string | null;
}

export default function PerfilCliente() {
  const router = useRouter();
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const usr = storage.getJSON<{ id: number }>("usuario");
    const token = storage.get("token");
    if (!usr || !token) {
      alert("Você precisa estar logado.");
      router.push("/login");
      return;
    }

    fetch(`http://localhost:3001/api/clientes/${usr.id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Não autorizado");
        return res.json();
      })
      .then((data: Cliente) => {
        setCliente(data);
      })
      .catch((err) => {
        console.error(err);
        alert("Erro ao carregar perfil.");
        router.push("/");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [router]);

  if (loading) {
    return <p className="carregando">Carregando perfil…</p>;
  }

  if (!cliente) {
    return null;
  }

  return (
    <div className="perfil-container">
      <h1>Meu Perfil</h1>
      <button className="btn-voltar" onClick={() => router.push("/")}>
        ← Voltar
      </button>

      <div className="perfil-card">
        {cliente.foto_url ? (
          <Image
            src={cliente.foto_url}
            alt={`Foto de ${cliente.nome}`}
            width={128}
            height={128}
            style={{ borderRadius: 64, objectFit: "cover", marginBottom: 12 }}
            priority
          />
        ) : null}
        <p>
          <strong>Nome:</strong> {cliente.nome} {cliente.sobrenome}
        </p>
        <p>
          <strong>CPF:</strong> {cliente.CPF || "—"}
        </p>
        <p>
          <strong>E-mail:</strong> {cliente.email}
        </p>
        <p>
          <strong>Telefone:</strong> {cliente.telefone || "—"}
        </p>

        <div className="botoes">
          <button
            onClick={() => router.push("/painel-cliente")}
            className="btn editar-btn"
          >
            Editar
          </button>
        </div>
      </div>
    </div>
  );
}
