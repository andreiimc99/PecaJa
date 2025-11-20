"use client";
import React from "react";
import { FaHeart } from "react-icons/fa";
import styles from "./FavoriteButton.module.css";

interface FavoriteButtonProps {
  active: boolean;
  onToggle: () => void;
  className?: string;
  compact?: boolean; // exibe apenas ícone circular
  addLabel?: boolean; // força mostrar label mesmo em compact
  activeLabel?: string;
  inactiveLabel?: string;
  ariaLabelActive?: string;
  ariaLabelInactive?: string;
}

export default function FavoriteButton({
  active,
  onToggle,
  className = "",
  compact = false,
  addLabel = true,
  activeLabel = "Desfavoritar",
  inactiveLabel = "Adicionar aos Favoritos",
  ariaLabelActive = "Remover dos favoritos",
  ariaLabelInactive = "Adicionar aos favoritos",
}: FavoriteButtonProps) {
  const label = active ? activeLabel : inactiveLabel;
  return (
    <button
      type="button"
      className={`${styles.favoriteButton} ${active ? styles.active : ""} ${
        compact ? styles.compact : ""
      } ${className}`.trim()}
      aria-pressed={active}
      aria-label={active ? ariaLabelActive : ariaLabelInactive}
      onClick={onToggle}
    >
      <FaHeart className={styles.iconHeart} />
      {addLabel && <span className={"labelText"}>{label}</span>}
    </button>
  );
}
