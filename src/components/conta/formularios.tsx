"use client";

import { Camera, Check, Monitor, Moon, Sun, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useRef, useState, useTransition } from "react";
import { Aviso, Avatar, Botao, Campo, classeEntrada } from "@/components/ui";
import { normalizarCelular } from "@/dominio/cadastro/telefone";
import type { Assunto, Canal, Preferencias, Tema } from "@/dominio/conta/preferencias";
import { prepararFoto, salvarFoto, salvarLocadora, salvarNome, salvarPreferencias } from "@/lib/acoes-conta";
import { comprimirImagem } from "@/lib/comprimir-imagem";
import { supabaseLinks, urlConfirmacao } from "@/lib/supabase/links";
import { supabaseNavegador } from "@/lib/supabase/navegador";
import { aplicarTema } from "@/lib/tema";

function Retorno({ estado }: { estado: { ok: boolean; erro?: string; mensagem?: string } | null }) {
  if (!estado) return null;
  if (!estado.ok) return <Aviso tom="perigo">{estado.erro}</Aviso>;
  return estado.mensagem ? <Aviso tom="ok">{estado.mensagem}</Aviso> : null;
}

/** Foto de perfil: escolhe, reduz no próprio celular e envia direto ao Storage. */
export function FormFoto({ nome, foto }: { nome: string; foto: string | null }) {
  const router = useRouter();
  const entrada = useRef<HTMLInputElement>(null);
  const [previa, setPrevia] = useState(foto);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function escolher(arquivo: File | undefined) {
    if (!arquivo) return;
    setErro(null);
    setOcupado(true);
    try {
      const pronta = await comprimirImagem(arquivo, { ladoMaximo: 512, qualidade: 0.85 });
      setPrevia(URL.createObjectURL(pronta));
      const { caminho, token } = await prepararFoto();
      const { error } = await supabaseNavegador().storage.from("avatares").uploadToSignedUrl(caminho, token, pronta, { contentType: "image/jpeg", cacheControl: "31536000" }); // cada foto tem caminho novo: pode ficar em cache por 1 ano
      if (error) throw error;
      const r = await salvarFoto(caminho);
      if (!r.ok) throw new Error(r.erro);
      router.refresh();
    } catch {
      setPrevia(foto);
      setErro("Não foi possível enviar a foto. Tente outra imagem.");
    } finally {
      setOcupado(false);
      if (entrada.current) entrada.current.value = "";
    }
  }

  async function remover() {
    setOcupado(true);
    const r = await salvarFoto(null);
    setOcupado(false);
    if (r.ok) {
      setPrevia(null);
      router.refresh();
    } else setErro(r.erro);
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <button type="button" onClick={() => entrada.current?.click()} className="group relative rounded-full" aria-label="Trocar foto de perfil" disabled={ocupado}>
        <Avatar nome={nome} foto={previa} tamanho="xl" className={ocupado ? "opacity-50" : ""} />
        <span className="absolute -right-0.5 -bottom-0.5 grid size-8 place-items-center rounded-full bg-marca text-white shadow-marca ring-4 ring-cartao"><Camera size={15} /></span>
      </button>
      <input ref={entrada} type="file" accept="image/*" className="hidden" onChange={(e) => escolher(e.target.files?.[0])} />
      <div className="flex gap-4 text-sm">
        <button type="button" className="font-semibold text-marca" onClick={() => entrada.current?.click()} disabled={ocupado}>{ocupado ? "Enviando…" : previa ? "Trocar foto" : "Adicionar foto"}</button>
        {previa && !ocupado && <button type="button" className="inline-flex items-center gap-1 font-semibold text-suave" onClick={remover}><Trash2 size={14} /> Remover</button>}
      </div>
      {erro && <Aviso tom="perigo">{erro}</Aviso>}
    </div>
  );
}

export function FormNome({ nome }: { nome: string }) {
  const [estado, acao, pendente] = useActionState(salvarNome, null);
  return (
    <form action={acao} className="flex flex-col gap-3">
      <Campo rotulo="Nome" dica="Aparece para o locador ou para o motorista nas conversas.">
        <input name="nome" defaultValue={nome} autoComplete="name" className={classeEntrada} maxLength={60} required />
      </Campo>
      <Retorno estado={estado} />
      <Botao disabled={pendente} className="self-start">{pendente ? "Salvando…" : "Salvar nome"}</Botao>
    </form>
  );
}

const ICONES_TEMA = { claro: Sun, escuro: Moon, auto: Monitor } as const;

export function FormAparencia({ preferencias, opcoes }: { preferencias: Preferencias; opcoes: readonly { id: Tema; rotulo: string; detalhe: string }[] }) {
  const [tema, setTema] = useState<Tema>(preferencias.tema);
  const [, iniciar] = useTransition();
  function escolher(t: Tema) {
    setTema(t);
    aplicarTema(t); // na hora, neste aparelho
    iniciar(async () => { await salvarPreferencias({ ...preferencias, tema: t }); }); // e na conta, para os outros aparelhos
  }
  return (
    <div className="grid gap-2.5" role="radiogroup" aria-label="Tema">
      {opcoes.map(({ id, rotulo, detalhe }) => {
        const Icone = ICONES_TEMA[id];
        const marcado = tema === id;
        return (
          <button key={id} type="button" role="radio" aria-checked={marcado} onClick={() => escolher(id)}
            className={`flex items-center gap-3 rounded-2xl border p-3.5 text-left transition-colors ${marcado ? "border-marca bg-marca-suave/60 ring-2 ring-marca/20" : "border-borda bg-cartao hover:bg-cartao-2"}`}>
            <span className={`grid h-12 w-16 shrink-0 place-items-center rounded-xl border ${id === "escuro" ? "border-[#1c2c4c] bg-[#0c1830] text-[#93a3c2]" : id === "claro" ? "border-[#e3e8f1] bg-white text-[#5b6880]" : "border-[#cdd5e3] bg-gradient-to-r from-white from-50% to-[#0c1830] to-50% text-[#5b8cff]"}`}>
              <Icone size={18} />
            </span>
            <span className="flex-1">
              <span className="block text-sm font-semibold">{rotulo}</span>
              <span className="block text-xs text-suave">{detalhe}</span>
            </span>
            <span className={`grid size-5 place-items-center rounded-full border-2 ${marcado ? "border-marca bg-marca text-white" : "border-borda-forte"}`}>{marcado && <Check size={12} strokeWidth={3} />}</span>
          </button>
        );
      })}
    </div>
  );
}

function Interruptor({ ligado, aoMudar, rotulo, detalhe, travado = false }: { ligado: boolean; aoMudar?: (v: boolean) => void; rotulo: string; detalhe: string; travado?: boolean }) {
  return (
    <label className={`flex items-center gap-3 px-4 py-3.5 ${travado ? "" : "cursor-pointer"}`}>
      <span className="flex-1">
        <span className="block text-sm font-semibold">{rotulo}</span>
        <span className="block text-xs text-suave">{detalhe}</span>
      </span>
      <input type="checkbox" className="peer sr-only" checked={ligado} disabled={travado} onChange={(e) => aoMudar?.(e.target.checked)} />
      <span aria-hidden className={`relative h-6 w-10 shrink-0 rounded-full transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-marca ${ligado ? "bg-marca" : "bg-borda-forte"} ${travado ? "opacity-60" : ""}`}>
        <span className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform ${ligado ? "translate-x-[1.125rem]" : "translate-x-0.5"}`} />
      </span>
    </label>
  );
}

export function FormNotificacoes({
  preferencias,
  canais,
  assuntos,
  formais,
}: {
  preferencias: Preferencias;
  canais: readonly { id: Canal; rotulo: string; detalhe: string }[];
  assuntos: readonly { id: Assunto; rotulo: string; detalhe: string }[];
  formais: { rotulo: string; detalhe: string };
}) {
  const [p, setP] = useState(preferencias);
  const [estado, setEstado] = useState<"salvo" | "erro" | null>(null);
  const [, iniciar] = useTransition();

  function mudar(novo: Preferencias) {
    if (!Object.values(novo.canais).some(Boolean)) return setEstado("erro");
    setP(novo);
    setEstado(null);
    iniciar(async () => setEstado((await salvarPreferencias(novo)).ok ? "salvo" : "erro"));
  }

  const lista = "divide-y divide-borda overflow-hidden rounded-2xl border border-borda bg-cartao shadow-cartao";
  return (
    <div className="flex flex-col gap-5">
      <section>
        <h2 className="mb-2 px-1 text-xs font-semibold tracking-wide text-suave uppercase">Por onde avisar</h2>
        <div className={lista}>
          {canais.map((c) => <Interruptor key={c.id} rotulo={c.rotulo} detalhe={c.detalhe} ligado={p.canais[c.id]} aoMudar={(v) => mudar({ ...p, canais: { ...p.canais, [c.id]: v } })} />)}
        </div>
        {estado === "erro" && <p className="mt-2 px-1 text-xs font-medium text-perigo">Deixe pelo menos um canal ligado para não perder os lembretes.</p>}
      </section>
      <section>
        <h2 className="mb-2 px-1 text-xs font-semibold tracking-wide text-suave uppercase">Sobre o quê</h2>
        <div className={lista}>
          <Interruptor rotulo={formais.rotulo} detalhe={formais.detalhe} ligado travado />
          {assuntos.map((a) => <Interruptor key={a.id} rotulo={a.rotulo} detalhe={a.detalhe} ligado={p.assuntos[a.id]} aoMudar={(v) => mudar({ ...p, assuntos: { ...p.assuntos, [a.id]: v } })} />)}
        </div>
      </section>
      <p className={`h-4 px-1 text-xs font-medium text-ok transition-opacity ${estado === "salvo" ? "opacity-100" : "opacity-0"}`}><Check size={13} className="inline" /> Preferências salvas</p>
    </div>
  );
}

/** Troca de e-mail: o Supabase manda um link de confirmação para o endereço novo. */
export function FormEmail({ atual, voltar }: { atual: string | null; voltar: string }) {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [ocupado, setOcupado] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    const novo = email.trim().toLowerCase();
    if (!novo.includes("@") || novo === atual) return setMsg({ ok: false, texto: "Informe um e-mail novo e válido." });
    setOcupado(true);
    // Sessão atual num cliente de fluxo implícito: o link de confirmação funciona em qualquer navegador.
    const { data } = await supabaseNavegador().auth.getSession();
    const cliente = supabaseLinks();
    if (data.session) await cliente.auth.setSession(data.session);
    const { error } = await cliente.auth.updateUser({ email: novo }, { emailRedirectTo: urlConfirmacao(voltar) });
    setOcupado(false);
    if (error) return setMsg({ ok: false, texto: error.code === "email_exists" ? "Esse e-mail já é de outra conta." : "Não foi possível trocar o e-mail agora. Tente de novo em um minuto." });
    setEmail("");
    setMsg({ ok: true, texto: `Enviamos um link para ${novo}. A troca vale depois que você tocar nele${atual ? " (pode chegar um aviso no e-mail antigo também)" : ""}.` });
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-3">
      {atual && <p className="text-sm">E-mail atual: <strong>{atual}</strong></p>}
      <Campo rotulo="E-mail novo"><input type="email" inputMode="email" autoComplete="email" className={classeEntrada} value={email} onChange={(e) => setEmail(e.target.value)} required /></Campo>
      {msg && <Aviso tom={msg.ok ? "ok" : "perigo"}>{msg.texto}</Aviso>}
      <Botao variante="secundario" disabled={ocupado} className="self-start">{ocupado ? "Enviando…" : "Trocar e-mail"}</Botao>
    </form>
  );
}

/** Confirma o celular com um código por SMS (necessário para os avisos no WhatsApp). */
export function VerificarCelular({ atual, confirmado }: { atual: string | null; confirmado: boolean }) {
  const router = useRouter();
  const [celular, setCelular] = useState("");
  const [enviadoPara, setEnviadoPara] = useState<string | null>(null);
  const [codigo, setCodigo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    const alvo = normalizarCelular(celular);
    if (!alvo) return setErro("Informe um celular com DDD, como (31) 99999-9999.");
    setOcupado(true);
    const { error } = await supabaseNavegador().auth.updateUser({ phone: alvo });
    setOcupado(false);
    if (error) return setErro(error.code === "phone_exists" ? "Esse celular já está em outra conta." : error.status === 429 ? "Espere um minuto antes de pedir outro código." : "Não foi possível enviar o SMS agora. Tente de novo mais tarde.");
    setEnviadoPara(alvo);
  }

  async function confirmar(e: React.FormEvent) {
    e.preventDefault();
    if (!enviadoPara) return;
    setErro(null);
    setOcupado(true);
    const { error } = await supabaseNavegador().auth.verifyOtp({ phone: enviadoPara, token: codigo.replace(/\D/g, ""), type: "phone_change" });
    setOcupado(false);
    if (error) return setErro("Código incorreto ou expirado.");
    setEnviadoPara(null);
    router.refresh();
  }

  if (enviadoPara) {
    return (
      <form onSubmit={confirmar} className="flex flex-col gap-3">
        <p className="text-sm">Enviamos um código por SMS para <strong>{enviadoPara}</strong>.</p>
        <Campo rotulo="Código"><input inputMode="numeric" autoComplete="one-time-code" maxLength={8} className={`${classeEntrada} text-center text-xl font-bold tracking-[0.3em]`} value={codigo} onChange={(e) => setCodigo(e.target.value)} autoFocus /></Campo>
        {erro && <Aviso tom="perigo">{erro}</Aviso>}
        <div className="flex items-center gap-4">
          <Botao disabled={ocupado || codigo.replace(/\D/g, "").length < 6}>{ocupado ? "Confirmando…" : "Confirmar"}</Botao>
          <button type="button" className="text-sm font-semibold text-suave" onClick={() => setEnviadoPara(null)}>Usar outro número</button>
        </div>
      </form>
    );
  }
  return (
    <form onSubmit={enviar} className="flex flex-col gap-3">
      {atual && <p className="text-sm">Celular {confirmado ? "confirmado" : "informado"}: <strong>{atual}</strong></p>}
      <Campo rotulo={atual ? "Trocar de celular" : "Celular com DDD"}>
        <input type="tel" inputMode="tel" autoComplete="tel-national" placeholder="(31) 99999-9999" className={classeEntrada} value={celular} onChange={(e) => setCelular(e.target.value)} required />
      </Campo>
      {erro && <Aviso tom="perigo">{erro}</Aviso>}
      <Botao variante="secundario" disabled={ocupado} className="self-start">{ocupado ? "Enviando…" : "Receber código por SMS"}</Botao>
    </form>
  );
}

export function FormLocadora({ nome, cidade, uf, modoAssistido, podeEditar }: { nome: string; cidade: string; uf: string; modoAssistido: boolean; podeEditar: boolean }) {
  const [estado, acao, pendente] = useActionState(salvarLocadora, null);
  return (
    <form action={acao} className="flex flex-col gap-4">
      <fieldset disabled={!podeEditar} className="flex flex-col gap-4">
        <Campo rotulo="Nome da locadora" dica="Aparece no contrato, nos anúncios e nas conversas."><input name="nome" defaultValue={nome} className={classeEntrada} required /></Campo>
        <div className="grid grid-cols-[1fr_5rem] gap-3">
          <Campo rotulo="Cidade"><input name="cidade" defaultValue={cidade} className={classeEntrada} required /></Campo>
          <Campo rotulo="UF"><input name="uf" defaultValue={uf} maxLength={2} className={`${classeEntrada} uppercase`} required /></Campo>
        </div>
        <label className="flex items-start gap-3 rounded-2xl border border-borda bg-cartao-2 p-3.5">
          <input type="checkbox" name="modo_assistido" defaultChecked={modoAssistido} className="mt-0.5 size-4 accent-[var(--marca)]" />
          <span>
            <span className="block text-sm font-semibold">Aprovar antes de enviar</span>
            <span className="block text-xs text-suave">Cobranças extras e notificações formais esperam a sua aprovação antes de sair. Recomendado no começo.</span>
          </span>
        </label>
      </fieldset>
      {!podeEditar && <Aviso tom="neutro">Só o dono da conta altera estes dados.</Aviso>}
      <Retorno estado={estado} />
      {podeEditar && <Botao disabled={pendente} className="self-start">{pendente ? "Salvando…" : "Salvar"}</Botao>}
    </form>
  );
}
