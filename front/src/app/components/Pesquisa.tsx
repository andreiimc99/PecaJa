"use client";

import React, { useState } from "react";
import Image from "next/image"; // Migrando icone para next/image
import { useRouter } from "next/navigation";
import "./Pesquisa.css";

function Pesquisa() {
  const [termo, setTermo] = useState("");
  const router = useRouter();

  const handleSearch = () => {
    if (termo.trim()) {
      router.push(`/busca?termo=${encodeURIComponent(termo)}`);
    }
  };

  return (
    <div className="pesquisa-bg">
      {" "}
      {/* Adicionando o div com a classe pesquisa-bg aqui */}
      <div className="pesquisa-container">
        <h2 className="pesquisa-titulo">
          ENCONTRE PEÇAS DE DESMANCHES PERTO DE VOCÊ
        </h2>
        <div className="pesquisa-barra">
          <input
            type="text"
            className="pesquisa-input"
            placeholder="Digite o que você procura..."
            value={termo}
            onChange={(e) => setTermo(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <button
            className="pesquisa-botao"
            onClick={handleSearch}
            aria-label="Pesquisar"
          >
            <Image
              src="/lupa.png"
              alt="Pesquisar"
              width={20}
              height={20}
              className="pesquisa-icone"
              priority
            />
          </button>
        </div>
      </div>
    </div>
  );
}

export default Pesquisa;
