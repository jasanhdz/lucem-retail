'use client';

import { ArrowRight, Check, Eye, EyeOff, LoaderCircle, LogOut, LockKeyhole, Mail, Store } from 'lucide-react';
import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from '@/services/auth';
import { getBusinesses, selectBusiness } from '@/services/businesses';
import { Brand } from './Brand';

type Business = { id: string; name: string; role?: string };

function AuthFrame({ children, title, description }: { children: React.ReactNode; title: string; description: string }) {
  return <main className="auth-page"><section className="auth-card"><div className="auth-card-content"><Brand className="auth-brand"/><span className="auth-badge"><span/> Terminal autorizada · v2.4</span><h1>{title}</h1><p className="auth-subtitle">{description}</p>{children}</div><div className="auth-card-footer"><LockKeyhole size={16}/> Acceso seguro · Personal autorizado</div></section></main>;
}

export function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setError('');
    setBusy(true);
    try {
      const response = await signIn(email.trim(), password);
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || 'No pudimos iniciar sesión. Revisa tus datos e inténtalo de nuevo.');
      router.push(typeof body.redirect === 'string' ? body.redirect : '/dashboard');
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error && reason.message ? reason.message : 'No fue posible conectar. Comprueba tu conexión e inténtalo de nuevo.');
    } finally { setBusy(false); }
  }

  return <AuthFrame title="Te damos la bienvenida" description="Ingresa con tu cuenta para continuar a tu espacio de trabajo.">
    <form className="auth-form" onSubmit={submit}>
      {error && <div role="alert" className="error-message">{error}</div>}
      <div className="field"><label htmlFor="email">Correo electrónico</label><div className="input-wrap"><Mail size={18} aria-hidden="true"/><input id="email" name="email" type="email" autoComplete="username" required value={email} onChange={event => setEmail(event.target.value)} placeholder="tu@tienda.com" /></div></div>
      <div className="field"><label htmlFor="password">Contraseña</label><div className="input-wrap"><LockKeyhole size={18} aria-hidden="true"/><input className="password-input" id="password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)} placeholder="Ingresa tu contraseña" /><button className="input-action" type="button" aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={showPassword} onClick={() => setShowPassword(value => !value)}>{showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}</button></div></div>
      <button className="button button-full" type="submit" disabled={busy}>{busy ? <><LoaderCircle size={17} className="spin" aria-hidden="true" /> Verificando…</> : <>Iniciar sesión <ArrowRight size={17} aria-hidden="true" /></>}</button>
       <p className="form-footnote">¿Aún no tienes cuenta? <Link href="/registro">Crea tu cuenta</Link></p>
    </form>
  </AuthFrame>;
}

export function BusinessesScreen() {
  const router = useRouter();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function loadBusinesses() {
    setLoading(true); setError('');
    try {
      const response = await getBusinesses();
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || 'No fue posible cargar tus negocios.');
      const list: Business[] = Array.isArray(body.businesses) ? body.businesses : [];
      setBusinesses(list);
      setSelected((current) => list.some(item => item.id === current) ? current : (list.find(item => item.id === body.activeBusinessId)?.id ?? list[0]?.id ?? ''));
    } catch (reason) { setError(reason instanceof Error && reason.message ? reason.message : 'No fue posible conectar. Inténtalo de nuevo.'); }
    finally { setLoading(false); }
  }

  useEffect(() => { void loadBusinesses(); }, []);

  async function confirm() {
    if (!selected || busy) return;
    setBusy(true); setError('');
    try {
      const response = await selectBusiness(selected);
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || 'No fue posible seleccionar este negocio.');
      router.push(typeof body.redirect === 'string' ? body.redirect : '/dashboard');
      router.refresh();
    } catch (reason) { setError(reason instanceof Error && reason.message ? reason.message : 'No fue posible conectar. Inténtalo de nuevo.'); }
    finally { setBusy(false); }
  }

  async function logout() { await fetch('/api/auth/logout', { method: 'POST' }); router.push('/login'); router.refresh(); }
  return <AuthFrame title="Elige tu negocio" description="Selecciona el comercio autorizado para iniciar tu turno de operación.">
     {loading ? <div role="status" aria-live="polite" className="loading-state"><LoaderCircle size={18} className="spin" aria-hidden="true" /> Cargando tus negocios…</div> : error && businesses.length === 0 ? <div className="auth-form"><div role="alert" className="error-message">{error}</div><button type="button" className="button button-secondary" onClick={() => void loadBusinesses()}>Reintentar</button><Link className="text-link" href="/login">Volver al inicio de sesión</Link></div> : businesses.length === 0 ? <div className="empty-state"><Store size={32}/><strong>Aún no tienes negocios</strong><span>Crea tu primer espacio de trabajo para comenzar a operar.</span><Link className="button" href="/negocios/crear">Crear mi primer negocio <ArrowRight size={17}/></Link></div> : <>
      {error && <div role="alert" className="error-message">{error}</div>}
       <div className="business-list" role="radiogroup" aria-label="Negocios disponibles">{businesses.map(business => <button key={business.id} type="button" role="radio" aria-checked={selected === business.id} aria-pressed={selected === business.id} className="business-option" onClick={() => setSelected(business.id)}><span className="business-avatar"><Store size={19} aria-hidden="true" /></span><span className="business-meta"><strong>{business.name}</strong><small>Rol: {business.role || 'Membresía'}</small></span>{selected === business.id && <Check size={19} color="var(--accent)" aria-label="Seleccionado" />}</button>)}</div>
      <button type="button" className="button button-full" disabled={!selected || busy} onClick={() => void confirm()}>{busy ? <><LoaderCircle size={17} className="spin" aria-hidden="true" /> Abriendo espacio…</> : <>Continuar <ArrowRight size={17} aria-hidden="true" /></>}</button>
       <p className="form-footnote"><button className="logout-link" type="button" onClick={() => void logout()}><LogOut size={16}/> Cerrar sesión</button></p>
    </>}
  </AuthFrame>;
}
