import type { Metadata } from "next";
import "./globals.css";
import Navbar from "./components/Navbar";
import ClientWrapper from "./context/ClientWrapper";
import Footer from "./components/Footer";

export const metadata: Metadata = {
  title: "PeçaJá",
  description: "Estoque de peças de veículos",
  keywords: "PeçaJá, Next.js, React",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      {/* Script de patch de localStorage removido para evitar conflitos de hidratação.
          A proteção de SSR é feita em src/instrumentation.ts e o acesso no cliente
          é intermediado por lib/storage.ts. */}
      {/* Remova a classe 'bg-white text-black' do body aqui se quiser que o background-color: #f0f2f5; do globals.css prevaleça. 
          Se você quer o body branco, mantenha o bg-white, mas então o main-content-wrapper é que precisa do background ou ser transparente para ver o body.
          Pela imagem, o fundo principal da página é um cinza claro. Então, o ideal é que o body tenha o #f0f2f5 e o card do perfil seja branco.
          Vamos deixar o body sem classes de background aqui para que o globals.css controle. */}
      <body>
        <ClientWrapper>
          <Navbar />
          {/* Adicionando a div .main-content-wrapper aqui */}
          <div className="main-content-wrapper">{children}</div>
          <Footer />
        </ClientWrapper>
      </body>
    </html>
  );
}
