"use client";

import React, { useEffect, useState, useRef } from "react";
import storage from "../../lib/storage";
import styles from "../painel.module.css";

type Cliente = {
  id: number;
  nome: string;
  email: string;
  telefone?: string;
  foto_url?: string;
  role?: string;
};

type Banner = {
  id: number;
  image_url: string;
  title?: string;
  target_url?: string;
  ordem?: number;
  ativo?: number;
};

export default function AdminPanel() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [desmanches, setDesmanches] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const successTimer = useRef<number | null>(null);
  const errorTimer = useRef<number | null>(null);
  // Tabs and logs state must be declared unconditionally (before any early return)
  const [tab, setTab] = useState<'dashboard' | 'usuarios' | 'desmanches' | 'carrossel' | 'tools' | 'logs'>('dashboard');
  const [logs, setLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  useEffect(() => {
    const t = storage.get("token");
    const u = storage.getJSON("usuario");
    setToken(t);
    setUser(u);
  }, []);

  // Evita que usuários sem permissão fiquem na aba Carrossel (por exemplo, desmanche)
  useEffect(() => {
    if (user && tab === 'carrossel' && user.role !== 'admin') {
      // força retorno ao dashboard se não for admin
      setTab('dashboard');
    }
  }, [user, tab]);

  useEffect(() => {
    if (!token || !user) return;
    if (user.role !== "admin") {
      setError("Acesso negado: você não é administrador.");
      return;
    }
    setLoading(true);
    (async () => {
      try {
        const base = process.env.NEXT_PUBLIC_API_URL || "";
        const [clientesRes, bannersRes, desmanchesRes] = await Promise.all([
          (await fetch(`${base}/api/admin/users/clientes`, { headers: { Authorization: `Bearer ${token}` } })).json(),
          (await fetch(`${base}/api/carousel/admin`, { headers: { Authorization: `Bearer ${token}` } })).json(),
          (await fetch(`${base}/api/admin/users/desmanches`, { headers: { Authorization: `Bearer ${token}` } })).json(),
        ]);
        setClientes(Array.isArray(clientesRes) ? clientesRes : []);
        setBanners(Array.isArray(bannersRes) ? bannersRes : []);
        setDesmanches(Array.isArray(desmanchesRes) ? desmanchesRes : []);
      } catch (e) {
        setError(String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [token, user]);

  const toggleDestaque = async (id: number, current: number | undefined) => {
    if (!token) return;
    try {
      const next = current ? 0 : 1;
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/users/desmanches/${id}/destaque`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ destaque: next }),
      });
      const isJson = (res.headers.get("content-type") || "").includes("application/json");
      const data = isJson ? await res.json() : null;
      if (!res.ok) throw new Error((data && (data as any).error) || res.statusText || 'Erro');
      setDesmanches((d) => d.map((it) => (it.id === id ? { ...it, destaque: next } : it)));
      setSuccess('Destaque atualizado com sucesso.');
      if (successTimer.current) window.clearTimeout(successTimer.current as any);
      successTimer.current = window.setTimeout(() => setSuccess(null), 4000);
    } catch (e) {
      setError(String(e));
      if (errorTimer.current) window.clearTimeout(errorTimer.current as any);
      errorTimer.current = window.setTimeout(() => setError(null), 8000);
    }
  };

  const toggleBanner = async (id: number) => {
    if (!token) return;
      try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/carousel/${id}/toggle`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      const isJson = (res.headers.get("content-type") || "").includes("application/json");
      const data = isJson ? await res.json() : null;
      if (!res.ok) throw new Error((data && (data as any).error) || res.statusText);
      setBanners((b) => b.map((it) => (it.id === id ? { ...it, ativo: it.ativo ? 0 : 1 } : it)));
      setSuccess("Status do banner atualizado.");
      if (successTimer.current) window.clearTimeout(successTimer.current as any);
      successTimer.current = window.setTimeout(() => setSuccess(null), 4000);
    } catch (e) {
      setError(String(e));
      if (errorTimer.current) window.clearTimeout(errorTimer.current as any);
      errorTimer.current = window.setTimeout(() => setError(null), 8000);
    }
  };

  const removeBanner = async (id: number) => {
    if (!token) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/carousel/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const isJson = (res.headers.get("content-type") || "").includes("application/json");
      const data = isJson ? await res.json() : null;
      if (!res.ok) throw new Error((data && (data as any).error) || res.statusText);
      setBanners((b) => b.filter((it) => it.id !== id));
      setSuccess("Banner removido com sucesso.");
      if (successTimer.current) window.clearTimeout(successTimer.current as any);
      successTimer.current = window.setTimeout(() => setSuccess(null), 4000);
    } catch (e) {
      setError(String(e));
      if (errorTimer.current) window.clearTimeout(errorTimer.current as any);
      errorTimer.current = window.setTimeout(() => setError(null), 8000);
    }
  };

  const saveClienteRole = async (id: number, role: string) => {
    if (!token) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/users/clientes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ role }),
      });
      const isJson = (res.headers.get("content-type") || "").includes("application/json");
      const data = isJson ? await res.json() : null;
      if (!res.ok) throw new Error((data && (data as any).error) || res.statusText);
      setClientes((c) => c.map((it) => (it.id === id ? { ...it, role } : it)));
      setSuccess("Role atualizado com sucesso.");
      if (successTimer.current) window.clearTimeout(successTimer.current as any);
      successTimer.current = window.setTimeout(() => setSuccess(null), 4000);
    } catch (e) {
      setError(String(e));
      if (errorTimer.current) window.clearTimeout(errorTimer.current as any);
      errorTimer.current = window.setTimeout(() => setError(null), 8000);
    }
  };

  // Formulário de criação de banner (upload)
  const [bannerTitle, setBannerTitle] = useState("");
  const [bannerTarget, setBannerTarget] = useState("");
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [creatingBanner, setCreatingBanner] = useState(false);

  const handleBannerCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !bannerFile) return;
    setCreatingBanner(true);
    try {
      const fd = new FormData();
      fd.append('image', bannerFile);
      fd.append('title', bannerTitle);
      fd.append('target_url', bannerTarget);

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/carousel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao criar banner');
      setBanners((b) => [data, ...b]);
      setBannerTitle('');
      setBannerTarget('');
      setBannerFile(null);
      setBannerPreview(null);
    } catch (err) {
      console.error(err);
      setError(String(err));
      if (errorTimer.current) window.clearTimeout(errorTimer.current as any);
      errorTimer.current = window.setTimeout(() => setError(null), 8000);
    } finally {
      setCreatingBanner(false);
    }
  };

  // Revoke object URL for preview when it changes/unmounts
  React.useEffect(() => {
    return () => {
      if (bannerPreview) {
        try { URL.revokeObjectURL(bannerPreview); } catch {}
      }
    };
  }, [bannerPreview]);

  // cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (successTimer.current) window.clearTimeout(successTimer.current as any);
      if (errorTimer.current) window.clearTimeout(errorTimer.current as any);
    };
  }, []);

  if (!token || !user) return <div style={{ padding: 20 }}>Faça login para acessar o painel.</div>;
  // UI simple tabs for admin tools

  const fetchLogs = async (opts: { limit?: number; offset?: number } = {}) => {
    if (!token) return;
    setLogsLoading(true);
    try {
      const q = new URLSearchParams();
      q.set('limit', String(opts.limit || 100));
      q.set('offset', String(opts.offset || 0));
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/logs?${q.toString()}`, { headers: { Authorization: `Bearer ${token}` } });
  const isJson = (res.headers.get("content-type") || "").includes("application/json");
  const data = isJson ? await res.json() : null;
  if (!res.ok) throw new Error((data && (data as any).error) || 'Erro ao buscar logs');
  setLogs(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(String(e));
    } finally {
      setLogsLoading(false);
    }
  };

  const DashboardView = () => (
    <div>
      <h2>Visão Geral</h2>
      <div className={styles.statsGrid} style={{ marginBottom: 12 }}>
        <div className={styles.statBox}>
          <div style={{ fontSize: 20 }}>{clientes.length}</div>
          <div style={{ color: '#666', fontWeight: 400, fontSize: 13 }}>Clientes</div>
        </div>
        <div className={styles.statBox}>
          <div style={{ fontSize: 20 }}>{banners.length}</div>
          <div style={{ color: '#666', fontWeight: 400, fontSize: 13 }}>Banners</div>
        </div>
      </div>

      <div style={{ marginTop: 8 }}>
        <h3 style={{ marginBottom: 8 }}>Atalhos técnicos</h3>
        <div className={styles.shortcutList} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <button className={styles.shortcutBadge} onClick={() => setTab('usuarios')} aria-label="Gerenciar Usuários">
            <span className={styles.shortcutIcon} aria-hidden>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 12c2.761 0 5-2.239 5-5s-2.239-5-5-5-5 2.239-5 5 2.239 5 5 5z" fill="#ff8c69"/><path d="M4 20c0-2.761 4.03-5 8-5s8 2.239 8 5v1H4v-1z" fill="#ffd2bf"/></svg>
            </span>
            Gerenciar Usuários
          </button>

          {/* somente administradores podem ver/ir para a aba Carrossel */}
          {user?.role === 'admin' && (
            <button className={styles.shortcutBadge} onClick={() => setTab('carrossel')} aria-label="Gerenciar Carrossel">
              <span className={styles.shortcutIcon} aria-hidden>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="5" width="18" height="4" rx="1" fill="#ffb089"/><rect x="3" y="11" width="14" height="4" rx="1" fill="#ffd2bf"/></svg>
              </span>
              Gerenciar Carrossel
            </button>
          )}

          <button className={styles.shortcutBadge} onClick={() => setTab('tools')} aria-label="Ferramentas">
            <span className={styles.shortcutIcon} aria-hidden>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M14.7 6.3l3 3-1.4 1.4-3-3-1.3 1.3 3 3L8 18H6v-2l7.3-7.3 1.4-1.4-3-3L14.7 6.3z" fill="#34495e"/></svg>
            </span>
            Ferramentas
          </button>
        </div>
      </div>
    </div>
  );

  const UsuariosView = () => (
    <div className={styles.panelSection}>
      <h2>Usuários (clientes)</h2>
      {loading ? (
        <p>Carregando...</p>
      ) : (
        <table className={styles.panelTable}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Nome</th>
              <th>Email</th>
              <th>Role</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {clientes.map((c) => (
              <tr key={c.id}>
                <td style={{ width: 60 }}>{c.id}</td>
                <td>{c.nome}</td>
                <td style={{ width: 220 }}>{c.email}</td>
                <td style={{ width: 140 }}>
                  <select className={styles.input} value={c.role || 'cliente'} onChange={(e) => saveClienteRole(c.id, e.target.value)}>
                    <option value="cliente">cliente</option>
                    <option value="admin">admin</option>
                  </select>
                </td>
                <td style={{ width: 120 }}>
                  <button className={styles.secondaryBtn} onClick={() => alert('Funcionalidade futura: ver detalhes')}>Detalhes</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  const CarrosselView = () => (
    <div className={styles.panelSection}>
      <h2>Carrossel</h2>
      <div>
        <form onSubmit={handleBannerCreate} className={styles.formRow} style={{ marginBottom: 12 }}>
          <input
            className={styles.input}
            type="file"
            accept="image/*"
            onChange={(e) => {
              const f = e.target.files ? e.target.files[0] : null;
              setBannerFile(f);
              if (f) {
                try {
                  const url = URL.createObjectURL(f);
                  setBannerPreview(url);
                } catch {
                  setBannerPreview(null);
                }
              } else {
                setBannerPreview(null);
              }
            }}
          />
          <input className={styles.input} placeholder="Título" value={bannerTitle} onChange={(e) => setBannerTitle(e.target.value)} />
          <input className={styles.input} placeholder="URL alvo" value={bannerTarget} onChange={(e) => setBannerTarget(e.target.value)} />
          <button className={styles.primaryBtn} type="submit" disabled={creatingBanner}>{creatingBanner ? 'Enviando...' : 'Criar Banner'}</button>
        </form>
        <div style={{ display: 'grid', gap: 10 }}>
          {/* preview of selected file */}
          {bannerPreview && (
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 8 }}>
              <img src={bannerPreview} alt="Preview" style={{ width: 140, height: 70, objectFit: 'cover', borderRadius: 6 }} />
              <div style={{ fontSize: 14, color: '#333' }}>{bannerFile?.name}</div>
            </div>
          )}

          {banners.map((b) => (
            <div key={b.id} style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 8 }}>
              <img src={b.image_url} alt={b.title || ''} style={{ width: 140, height: 70, objectFit: 'cover', borderRadius: 6 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700 }}>{b.title}</div>
                <div style={{ color: '#666' }}>{b.target_url}</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className={styles.secondaryBtn} onClick={() => toggleBanner(b.id)}>{b.ativo ? 'Desativar' : 'Ativar'}</button>
                <button className={styles.secondaryBtn} onClick={() => removeBanner(b.id)}>Remover</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const ToolsView = () => (
    <div className={styles.panelSection}>
      <h2>Ferramentas técnicas</h2>
      <p style={{ marginTop: 0 }}>Operações de manutenção e diagnóstico para a equipe técnica.</p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className={styles.secondaryBtn} onClick={() => alert('Placeholder: limpar cache (não implementado)')}>Limpar cache</button>
        <button className={styles.secondaryBtn} onClick={() => alert('Placeholder: executar migração (não implementado)')}>Executar migração</button>
        <button className={styles.secondaryBtn} onClick={() => alert('Placeholder: visualizar logs (não implementado)')}>Ver logs</button>
      </div>
    </div>
  );

  const LogsView = () => (
    <div className={styles.panelSection}>
      <h2>Logs Administrativos</h2>
      <p style={{ marginTop: 0 }}>Registro das ações realizadas por administradores e pelo sistema.</p>
      <div style={{ marginBottom: 12 }}>
        <button className={styles.primaryBtn} onClick={() => fetchLogs({ limit: 100 })} disabled={logsLoading}>{logsLoading ? 'Carregando...' : 'Atualizar'}</button>
      </div>
      {logsLoading ? (
        <p>Carregando logs...</p>
      ) : (
        <table className={styles.panelTable}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Admin ID</th>
              <th>Ação</th>
              <th>Tabela</th>
              <th>Target ID</th>
              <th>Detalhes</th>
              <th>Quando</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id}>
                <td style={{ width: 60 }}>{l.id}</td>
                <td style={{ width: 80 }}>{l.admin_id}</td>
                <td style={{ width: 140 }}>{l.action}</td>
                <td style={{ width: 120 }}>{l.target_table}</td>
                <td style={{ width: 80 }}>{l.target_id}</td>
                <td style={{ maxWidth: 360, overflow: 'hidden', textOverflow: 'ellipsis' }}>{typeof l.details === 'string' ? l.details : JSON.stringify(l.details)}</td>
                <td style={{ width: 160 }}>{new Date(l.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  const DesmanchesView = () => (
    <div className={styles.panelSection}>
      <h2>Desmanches</h2>
      {loading ? (
        <p>Carregando...</p>
      ) : (
        <table className={styles.panelTable}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Nome</th>
              <th>Email</th>
              <th>Horário</th>
              <th>Destaque</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {desmanches.map((d) => (
              <tr key={d.id}>
                <td style={{ width: 60 }}>{d.id}</td>
                <td>{d.nome}</td>
                <td style={{ width: 220 }}>{d.email}</td>
                <td style={{ width: 220 }}>{d.horario || '-'}</td>
                <td style={{ width: 100 }}>{d.destaque ? 'Sim' : 'Não'}</td>
                <td style={{ width: 200 }}>
                  <button className={styles.secondaryBtn} onClick={() => toggleDestaque(d.id, d.destaque)}>{d.destaque ? 'Remover destaque' : 'Marcar destaque'}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  return (
    <div className={styles.container}>
      <div className={styles.headerRow}>
        <div>
          <h1 className={styles.title}>Painel Administrativo</h1>
          <p className={styles.subtitle}>Bem-vindo, <strong>{user?.nome}</strong></p>
        </div>
      </div>

      {/* mensagens de erro/sucesso visíveis dentro do painel */}
      {error && (
        <div className={`${styles.msgBox} ${styles.errorBox}`} role="alert">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>{error}</div>
            <div className={styles.msgActions}>
              <button className={styles.secondaryBtn} onClick={() => setError(null)}>Fechar</button>
            </div>
          </div>
        </div>
      )}
      {success && (
        <div className={`${styles.msgBox} ${styles.successBox}`} role="status">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>{success}</div>
            <div className={styles.msgActions}>
              <button className={styles.secondaryBtn} onClick={() => setSuccess(null)}>OK</button>
            </div>
          </div>
        </div>
      )}

      <nav className={styles.actionsGrid} aria-label="Ações do painel administrativo">
        <button className={styles.actionCard} onClick={() => setTab('dashboard')}>
          <span className={styles.actionIcon} aria-hidden>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="12" width="4" height="8" rx="1" fill="var(--brand)"/><rect x="10" y="9" width="4" height="11" rx="1" fill="#ffb089"/><rect x="16" y="6" width="4" height="14" rx="1" fill="#ffd2bf"/></svg>
          </span>
          <span className={styles.actionText}>Dashboard</span>
        </button>

        <button className={styles.actionCard} onClick={() => setTab('usuarios')}>
          <span className={styles.actionIcon} aria-hidden>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="8" r="4" fill="var(--brand)"/><path d="M4 20a8 8 0 0116 0" stroke="#e6e6e6" strokeWidth="2"/></svg>
          </span>
          <span className={styles.actionText}>Gerenciar Usuários</span>
        </button>

        {user?.role === 'admin' && (
          <button className={styles.actionCard} onClick={() => setTab('carrossel')}>
            <span className={styles.actionIcon} aria-hidden>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="5" width="18" height="4" rx="1" fill="var(--brand)"/><rect x="3" y="10" width="18" height="4" rx="1" fill="#ffb089"/><rect x="3" y="15" width="18" height="4" rx="1" fill="#ffd2bf"/></svg>
            </span>
            <span className={styles.actionText}>Gerenciar Carrossel</span>
          </button>
        )}

        {user?.role === 'admin' && (
          <button className={styles.actionCard} onClick={() => setTab('desmanches')}>
            <span className={styles.actionIcon} aria-hidden>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2v6" stroke="var(--brand)" strokeWidth="2" strokeLinecap="round"/><path d="M6 12h12" stroke="#ffb089" strokeWidth="2" strokeLinecap="round"/><path d="M6 18h12" stroke="#ffd2bf" strokeWidth="2" strokeLinecap="round"/></svg>
            </span>
            <span className={styles.actionText}>Gerenciar Desmanches</span>
          </button>
        )}

        <button className={`${styles.actionCard} ${styles.actionAlt}`} onClick={() => setTab('tools')}>
          <span className={styles.actionIcon} aria-hidden>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 3l2.6 5.3 5.9.9-4.3 4.2 1 5.8L12 16.9 6.8 20.2l1-5.8L3.5 9.2l5.9-.9L12 3z" fill="#34495e"/></svg>
          </span>
          <span className={styles.actionText}>Ferramentas</span>
        </button>
        <button className={styles.actionCard} onClick={() => setTab('logs')}>
          <span className={styles.actionIcon} aria-hidden>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 6h16v2H4z" fill="var(--brand)"/><path d="M4 11h16v2H4z" fill="#ffb089"/><path d="M4 16h10v2H4z" fill="#ffd2bf"/></svg>
          </span>
          <span className={styles.actionText}>Logs</span>
        </button>
      </nav>

      <div className={styles.contentArea}>
        {tab === 'dashboard' && <DashboardView />}
        {tab === 'usuarios' && <UsuariosView />}
        {tab === 'desmanches' && <DesmanchesView />}
  {tab === 'carrossel' && user?.role === 'admin' && <CarrosselView />}
        {tab === 'tools' && <ToolsView />}
        {tab === 'logs' && <LogsView />}
      </div>
    </div>
  );
}
