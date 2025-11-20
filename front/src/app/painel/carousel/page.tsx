"use client";
import React, { useEffect, useState, useMemo } from "react";
import Image from "next/image";
import storage from "@/app/lib/storage";
import styles from "./carousel-admin.module.css";
import { apiUrl } from "@/app/lib/api-base";

interface Banner {
  id: number;
  image_url: string;
  title: string | null;
  target_url: string | null;
  ativo?: number | boolean;
  ordem?: number;
}

export default function CarouselAdminPage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [targetUrl, setTargetUrl] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [msgType, setMsgType] = useState<"erro" | "sucesso" | null>(null);

  const token = storage.get("token");
  const usuario = storage.getJSON<{ role: string }>("usuario");

  useEffect(() => {
    const endpoint =
      token && usuario?.role === "desmanche"
        ? "/api/carousel/admin"
        : "/api/carousel";
    const headers: Record<string, string> = {};
    if (endpoint.endsWith("/admin") && token)
      headers["Authorization"] = `Bearer ${token}`;

    fetch(apiUrl(endpoint), { headers })
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: Banner[]) => setBanners(rows))
      .catch(() => setBanners([]))
      .finally(() => setLoading(false));
  }, [token, usuario?.role]);

  const refresh = () => {
    setLoading(true);
    const endpoint =
      token && usuario?.role === "desmanche"
        ? "/api/carousel/admin"
        : "/api/carousel";
    const headers: Record<string, string> = {};
    if (endpoint.endsWith("/admin") && token)
      headers["Authorization"] = `Bearer ${token}`;
    fetch(apiUrl(endpoint), { headers })
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: Banner[]) => setBanners(rows))
      .catch(() => setBanners([]))
      .finally(() => setLoading(false));
  };

  const handleCreate = async () => {
    setMsg(null);
    setMsgType(null);
    if (!file) {
      setMsg("Selecione uma imagem.");
      setMsgType("erro");
      return;
    }
    if (!token || !usuario || usuario.role !== "desmanche") {
      setMsg("Apenas desmanches podem gerenciar o carrossel.");
      setMsgType("erro");
      return;
    }
    const fd = new FormData();
    fd.append("image", file);
    if (title) fd.append("title", title);
    if (targetUrl) fd.append("target_url", targetUrl);
    try {
      const res = await fetch(apiUrl("/api/carousel"), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const ct = res.headers.get("content-type") || "";
      let data: unknown;
      if (ct.includes("application/json")) {
        data = await res.json();
      } else {
        const text = await res.text();
        throw new Error(
          `Resposta inesperada do servidor (não-JSON): ${text.slice(0, 120)}`
        );
      }
      if (!res.ok) {
        const errMsg =
          (data as { error?: string }).error || "Falha ao criar banner.";
        throw new Error(errMsg);
      }
      setMsg("Banner criado com sucesso!");
      setMsgType("sucesso");
      setFile(null);
      setTitle("");
      setTargetUrl("");
      refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setMsg(msg);
      setMsgType("erro");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Remover este banner?")) return;
    if (!token || !usuario || usuario.role !== "desmanche") {
      setMsg("Apenas desmanches podem gerenciar o carrossel.");
      setMsgType("erro");
      return;
    }
    try {
      const res = await fetch(apiUrl(`/api/carousel/${id}`), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const ct = res.headers.get("content-type") || "";
      let data: unknown;
      if (ct.includes("application/json")) {
        data = await res.json();
      } else {
        const text = await res.text();
        throw new Error(
          `Resposta inesperada do servidor (não-JSON): ${text.slice(0, 120)}`
        );
      }
      if (!res.ok)
        throw new Error(
          (data as { error?: string }).error || "Falha ao remover."
        );
      setMsg("Banner removido.");
      setMsgType("sucesso");
      refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setMsg(msg);
      setMsgType("erro");
    }
  };

  const previewUrl = useMemo(
    () => (file ? URL.createObjectURL(file) : null),
    [file]
  );

  const handleToggle = async (id: number) => {
    if (!token || !usuario || usuario.role !== "desmanche") {
      setMsg("Apenas desmanches podem gerenciar o carrossel.");
      setMsgType("erro");
      return;
    }
    try {
      const res = await fetch(
        apiUrl(`/api/carousel/${id}/toggle`),
        {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const ct = res.headers.get("content-type") || "";
      if (ct.includes("application/json")) {
        await res.json();
      } else {
        await res.text();
      }
      if (!res.ok) throw new Error("Falha ao alternar banner.");
      refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setMsg(msg);
      setMsgType("erro");
    }
  };

  return (
    <div className={styles.wrapper}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Gerenciar Carrossel</h1>
          <p className={styles.subtitle}>
            Imagens em destaque exibidas na página inicial.
          </p>
        </div>
      </header>

      <section className={styles.panel} aria-labelledby="novo-banner-heading">
        <h2 id="novo-banner-heading" className={styles.panelTitle}>
          Novo Banner
        </h2>
        <div className={styles.form}>
          <div className={styles.formRow}>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            {previewUrl && (
              <div className={styles.previewWrapper}>
                <Image
                  src={previewUrl}
                  alt="Pré-visualização"
                  width={220}
                  height={70}
                  className={styles.previewImg}
                />
              </div>
            )}
          </div>
          <input
            type="text"
            placeholder="Título opcional"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <input
            type="text"
            placeholder="URL de destino (opcional)"
            value={targetUrl}
            onChange={(e) => setTargetUrl(e.target.value)}
          />
          <button
            onClick={handleCreate}
            disabled={loading}
            className={styles.primaryBtn}
          >
            {loading ? "Processando..." : "Adicionar Banner"}
          </button>
          {msg && (
            <div
              role="alert"
              className={`${styles.message} ${
                msgType === "erro" ? styles.msgErro : styles.msgSucesso
              }`}
            >
              {msg}
            </div>
          )}
        </div>
      </section>

      {loading ? <p className={styles.loading}>Carregando...</p> : null}

      <div className={styles.grid} aria-live="polite">
        {banners.map((b) => (
          <div key={b.id} className={styles.card}>
            <div className={styles.thumbWrapper}>
              <Image
                src={b.image_url}
                alt={b.title || `banner-${b.id}`}
                width={480}
                height={140}
                className={styles.bannerImg}
                priority
              />
              {b.title && <span className={styles.badge}>{b.title}</span>}
            </div>
            <div className={styles.meta}>
              <div className={styles.metaRow}>
                <strong>{b.title || "(sem título)"}</strong>
                <span
                  className={`${styles.statusChip} ${
                    (b.ativo ? 1 : 0) === 1 ? styles.statusOn : styles.statusOff
                  }`}
                >
                  {(b.ativo ? 1 : 0) === 1 ? "Ativo" : "Inativo"}
                </span>
              </div>
              {b.target_url && (
                <a
                  href={b.target_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.linkBtn}
                >
                  Abrir link
                </a>
              )}
            </div>
            <div className={styles.cardActions}>
              <button
                onClick={() => handleToggle(b.id)}
                className={styles.toggleBtn}
              >
                {(b.ativo ? 1 : 0) === 1 ? "Desativar" : "Ativar"}
              </button>
              <button
                onClick={() => handleDelete(b.id)}
                className={styles.delBtn}
              >
                Remover
              </button>
            </div>
          </div>
        ))}
        {banners.length === 0 && !loading && (
          <p className={styles.emptyState}>Nenhum banner cadastrado.</p>
        )}
      </div>
    </div>
  );
}
