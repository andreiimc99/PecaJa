// src/components/CardDetalhe.tsx
import React from "react";
import Image from "next/image"; // Migrando <img> para <Image>
import "./CardDetalhe.css";

interface Peca {
  id: number;
  nome: string;
  descricao: string;
  preco: string;
}

interface CardDetalheProps {
  imagem: string;
  nome: string;
  horario: string;
  endereco: string;
  telefone: string;
  descricao: string;
  pecas?: Peca[]; // opcional
}

export default function CardDetalhe(props: CardDetalheProps) {
  return (
    <div className="detalhe-container">
      {/* Topo com foto e infos */}
      <div className="detalhe-topo">
        <Image
          src={props.imagem || "/logo.png"}
          alt={props.nome}
          width={130}
          height={130}
          className="detalhe-imagem"
          placeholder="blur"
          blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII="
          priority
        />
        <div className="detalhe-infos">
          <h2 className="detalhe-nome">{props.nome}</h2>
          <p>
            <span className="icon">📍</span>
            <strong>Endereço:</strong> {props.endereco}
          </p>
          <p>
            <span className="icon">📞</span>
            <strong>Telefone:</strong> {props.telefone}
          </p>
          <p>
            <span className="icon">🕒</span>
            <strong>Horário:</strong> {props.horario}
          </p>
        </div>
      </div>
      <p className="detalhe-descricao">{props.descricao}</p>

      {/* Separador */}
      <hr className="detalhe-separador" />

      {/* Lista de peças */}
      <h3 className="pecas-titulo">Peças disponíveis</h3>
      <div className="pecas-lista">
        {props.pecas && props.pecas.length > 0 ? (
          props.pecas.map((peca) => (
            <div key={peca.id} className="peca-card">
              <strong>{peca.nome}</strong>
              <p>{peca.descricao}</p>
              <span className="peca-preco">{peca.preco}</span>
            </div>
          ))
        ) : (
          <p>Nenhuma peça cadastrada.</p>
        )}
      </div>
    </div>
  );
}
