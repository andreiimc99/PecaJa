// src/app/page.tsx
"use client";

import React from "react";
import Home from "./components/Home";
import "./globals.css"; // Mantido conforme estava
import "./page.css"; // estilos de layout específicos da página inicial

export default function Page() {
  return (
    <div className="home-hero">
      <Home />
    </div>
  );
}
