// src/app/planos/page.tsx
'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import './Planos.css';

export default function PaginaPlanos() {
  const router = useRouter();

  return (
    <div className="planos-pagina-container">
      <header className="planos-header">
        <h1>Nossos Planos</h1>
        <p>Escolha o plano que melhor se adapta às necessidades do seu desmanche.</p>
      </header>

      <div className="planos-grid">
        {/* Plano Básico */}
        <div className="plano-card">
          <h2 className="plano-titulo">Free</h2>
          <p className="plano-preco">R$ 0<span className="preco-sufixo">/mês</span></p>
          <ul className="plano-features">
            <li>Até 50 peças cadastradas</li>
            <li>Perfil público do desmanche</li>
            <li>Suporte via e-mail</li>
          </ul>
          <button className="plano-botao">Assinar Agora</button>
        </div>

        {/* Plano Profissional (com destaque) */}
        {/* Este será o segundo e último plano agora */}
        <div className="plano-card destaque">
          <div className="plano-destaque-tag">Mais Popular</div>
          <h2 className="plano-titulo">Premium</h2>
          <p className="plano-preco">R$ 99<span className="preco-sufixo">/mês</span></p>
          <ul className="plano-features">
            <li>Gestão de estoque por meio de importação/exportação por meio de CSV.</li>
            <li>Acesso a dados</li>
            <li>Perfil destaque</li>
          </ul>
          <button className="plano-botao">Assinar Agora</button>
        </div>

        {/* REMOVIDO: Plano Empresa */}
      </div>

      <button onClick={() => router.back()} className="botao-voltar-planos">
        &larr; Voltar ao Painel
      </button>
    </div>
  );
}