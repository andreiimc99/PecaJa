// src/app/components/ImportModal.tsx
import React from 'react';
import styles from "../produto/produtodetalhe.module.css";

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExportTemplate: () => void;
  onImportFile: (event: React.ChangeEvent<HTMLInputElement>) => void;
  loading: boolean;
}

export default function ImportModal({
  isOpen,
  onClose,
  onExportTemplate,
  onImportFile,
  loading,
}: ImportModalProps) {
  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div 
        className={styles.modalContent} 
        onClick={(e) => e.stopPropagation()} 
      >
        <button className={styles.modalCloseButton} onClick={onClose}>
          &times;
        </button>
        <h3 className={styles.modalTitle}>Importar Estoque via CSV</h3>
        
        <p className={styles.modalStep}>
          <strong>Passo 1:</strong> Baixe o template para garantir o formato correto.
        </p>
        <button 
          className={styles.btnExportTemplate} 
          onClick={onExportTemplate}
          disabled={loading}
        >
          Baixar Template (CSV)
        </button>

        <p className={styles.modalStep}>
          <strong>Passo 2:</strong> Importe o arquivo CSV modificado.
        </p>
        <label htmlFor="import-final-csv" className={styles.btnImportFinal}>
          {loading ? 'Processando...' : 'Importar Arquivo Modificado'}
        </label>
        <input
          type="file"
          id="import-final-csv"
          accept=".csv"
          onChange={onImportFile}
          disabled={loading}
          style={{ display: 'none' }}
        />
        
        {loading && <p className={styles.modalLoading}>Processando importação...</p>}
      </div>
    </div>
  );
}
