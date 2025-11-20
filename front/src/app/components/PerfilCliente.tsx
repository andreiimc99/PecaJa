'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import './PerfilCliente.css';

export interface Cliente {
  id: number;
  nome: string;
  sobrenome: string;
  CPF: string;
  email: string;
  telefone?: string;
}

interface PerfilClienteProps {
  cliente: Cliente;
  isLoading: boolean;
}

export default function PerfilCliente({ cliente, isLoading }: PerfilClienteProps) {
  const router = useRouter();

  if (isLoading) {
    return <p className="perfil-cliente-loading">Carregando perfil…</p>;
  }

  return (
    <div className="perfil-cliente-card">
      <h2 className="perfil-cliente-title">Meu Perfil</h2>
      <button className="perfil-cliente-back" onClick={() => router.back()}>
        ← Voltar
      </button>
      <div className="perfil-cliente-fields">
        <p><strong>Nome:</strong> {cliente.nome} {cliente.sobrenome}</p>
        <p><strong>CPF:</strong> {cliente.CPF}</p>
        <p><strong>E-mail:</strong> {cliente.email}</p>
        <p><strong>Telefone:</strong> {cliente.telefone || '—'}</p>
      </div>
    </div>
  );
}
