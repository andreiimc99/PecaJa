import React from 'react';
import Link from 'next/link';
import { FaFacebook, FaInstagram, FaTwitter } from 'react-icons/fa';
import './Footer.css';

export default function Footer() {
  const anoAtual = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-section sobre">
          <h2 className="footer-logo">Peça.Já</h2>
          <p>
            A plataforma definitiva para encontrar peças de desmanche de forma
            rápida, segura e confiável. Conectamos você aos melhores desmanches do país.
          </p>
        </div>

        <div className="footer-section links">
          <h3>Navegação</h3>
          <ul>
            <li><Link href="/">Página Inicial</Link></li>
            <li><Link href="/busca">Buscar Peças</Link></li>
            <li><Link href="/login">Login</Link></li>
            <li><Link href="/cadastro">Cadastro</Link></li>
          </ul>
        </div>

        <div className="footer-section contato">
          <h3>Contato</h3>
          <p>Email: contato@pecaja.com.br</p>
          <p>Telefone: (53) 99999-9999</p>
          <div className="social-icons">
            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer"><FaFacebook /></a>
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer"><FaInstagram /></a>
            <a href="https://twitter.com" target="_blank" rel="noopener noreferrer"><FaTwitter /></a>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <p>&copy; {anoAtual} Peça.Já. Todos os direitos reservados.</p>
      </div>
    </footer>
  );
}