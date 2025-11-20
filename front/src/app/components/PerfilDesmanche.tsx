// src/app/components/PerfilDesmanche.tsx
"use client";

import React, { useEffect, useState, FormEvent, ChangeEvent } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import styles from "../perfil-desmanche/perfil-desmanche.module.css";
import storage from "@/app/lib/storage";

interface DesmancheData {
  nome: string;
  email: string;
  cnpj: string;
  telefone: string | null;
  endereco: string | null;
  horario: string | null;
  descricao: string | null;
  foto_url: string | null;
}

export default function PerfilDesmanche() {
  const router = useRouter();
  const [formData, setFormData] = useState<DesmancheData | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [arquivoFoto, setArquivoFoto] = useState<File | null>(null);
  const [previewFoto, setPreviewFoto] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const fetchPerfil = async () => {
      const token = storage.get("token");
      if (!token) {
        router.replace("/login");
        return;
      }
      try {
        const base = process.env.NEXT_PUBLIC_API_URL || "";
        const res = await fetch(`${base}/api/desmanches/meu-perfil`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Falha ao carregar os dados do perfil.");
        const data = await res.json();
        setFormData(data);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setMessage(msg);
      } finally {
        setLoading(false);
      }
    };
    fetchPerfil();
    // Dependência explícita de router para evitar stale closures e atender o ESLint
  }, [router]);

  const handleTextChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    if (formData) {
      setFormData({ ...formData, [e.target.name]: e.target.value });
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setArquivoFoto(file);
      setPreviewFoto(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);
    const token = storage.get("token");
    const rawUser = storage.get("usuario");
    const user = rawUser ? JSON.parse(rawUser) : {};
    if (!token || !user.id || !formData) {
      setLoading(false);
      return;
    }

    const dadosFormulario = new FormData();
    dadosFormulario.append("nome", formData.nome);
    dadosFormulario.append("email", formData.email);
    dadosFormulario.append("telefone", formData.telefone || "");
    dadosFormulario.append("endereco", formData.endereco || "");
    dadosFormulario.append("horario", formData.horario || "");
    dadosFormulario.append("descricao", formData.descricao || "");

    if (arquivoFoto) {
      dadosFormulario.append("foto_url", arquivoFoto);
    } else if (formData.foto_url) {
      dadosFormulario.append("foto_url_existente", formData.foto_url);
    }

    try {
      const base = process.env.NEXT_PUBLIC_API_URL || "";
      const res = await fetch(`${base}/api/desmanches/${user.id}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: dadosFormulario,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao atualizar desmanche");

      setMessage("Perfil atualizado com sucesso!");
      if (data.novaFotoUrl) {
        setFormData({ ...formData, foto_url: data.novaFotoUrl });
        setPreviewFoto(null);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleting) return;
    const token = storage.get("token");
    const rawUser = storage.get("usuario");
    const user = rawUser ? JSON.parse(rawUser) : {};
    if (!token || !user.id) return;

    const confirm1 = window.confirm(
      "Tem certeza que deseja excluir sua conta de desmanche? Esta ação é irreversível."
    );
    if (!confirm1) return;

    const phrase = window.prompt(
      "Digite EXCLUIR para confirmar a exclusão permanente da sua conta:",
      ""
    );
    if ((phrase || "").trim().toUpperCase() !== "EXCLUIR") {
      alert("Confirmação não reconhecida. A conta não foi excluída.");
      return;
    }

    try {
      setDeleting(true);
      const res = await fetch(
        `http://localhost:3001/api/desmanches/${user.id}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(txt || "Falha ao excluir conta.");
      }
      alert("Conta excluída com sucesso. Obrigado por utilizar o PeçaJá.");
      try {
        storage.remove("token");
        storage.remove("usuario");
      } catch {}
      router.replace("/");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(msg);
    } finally {
      setDeleting(false);
    }
  };

  if (loading)
    return <div className={styles.loadingMessage}>Carregando perfil...</div>;
  if (!formData)
    return (
      <div className={styles.errorMessage}>
        Não foi possível carregar os dados. {message}
      </div>
    );

  return (
    <div className={styles.perfilContainer}>
      <h1>Editar Perfil do Desmanche</h1>
      <div className={styles.perfilLayout}>
        <form className={styles.perfilMain} onSubmit={handleSubmit}>
          <div className={styles.sectionCard}>
            <h3 className={styles.sectionTitle}>Informações básicas</h3>
            <label>CNPJ (não editável)</label>
            <input
              type="text"
              value={formData.cnpj}
              readOnly
              className={styles.perfilReadonly}
            />

            <label>Nome</label>
            <input
              name="nome"
              value={formData.nome}
              onChange={handleTextChange}
            />

            <label>E-mail</label>
            <input
              name="email"
              type="email"
              value={formData.email}
              onChange={handleTextChange}
            />

            <label>Telefone</label>
            <input
              name="telefone"
              value={formData.telefone || ""}
              onChange={handleTextChange}
            />
          </div>

          <div className={styles.sectionCard}>
            <h3 className={styles.sectionTitle}>Local e atendimento</h3>
            <label>Endereço</label>
            <input
              name="endereco"
              value={formData.endereco || ""}
              onChange={handleTextChange}
            />

            <label>Horário de Atendimento</label>
            <input
              name="horario"
              value={formData.horario || ""}
              onChange={handleTextChange}
            />
          </div>

          <div className={styles.sectionCard}>
            <h3 className={styles.sectionTitle}>Descrição</h3>
            <textarea
              name="descricao"
              value={formData.descricao || ""}
              onChange={handleTextChange}
              rows={4}
            />
          </div>

          <div className={styles.actionsRow}>
            <button
              type="submit"
              className={styles.perfilBtn}
              disabled={loading}
            >
              {loading ? "Salvando..." : "Salvar Alterações"}
            </button>
            <button
              type="button"
              className={`${styles.perfilBtn} ${styles.dangerBtn}`}
              onClick={handleDeleteAccount}
              disabled={loading || deleting}
              title="Excluir definitivamente minha conta"
            >
              {deleting ? "Excluindo..." : "Excluir Conta"}
            </button>
            {message && <p className={styles.perfilMsg}>{message}</p>}
          </div>
        </form>

        <aside className={`${styles.perfilSide} ${styles.stickySide}`}>
          <div className={styles.sectionCard}>
            <h3 className={styles.sectionTitle}>Foto do perfil</h3>
            <div className={styles.uploadContainer}>
              <Image
                src={previewFoto || formData.foto_url || "/logo.png"}
                alt="Preview do Perfil"
                className={styles.fotoPreview}
                width={100}
                height={100}
              />
              <input
                type="file"
                accept="image/png, image/jpeg, image/webp"
                onChange={handleFileChange}
                className={styles.fileInput}
              />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
