"use client";

import { Eye, EyeOff, MailCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Aviso, Botao, Campo, classeEntrada } from "@/components/ui";
import { normalizarCelular } from "@/dominio/cadastro/telefone";
import { supabaseNavegador } from "@/lib/supabase/navegador";

type Modo = "entrar" | "criar" | "codigo" | "esqueci";

const ERROS: Record<string, string> = {
  invalid_credentials: "E-mail ou senha incorretos.",
  email_not_confirmed: "Confirme seu e-mail pelo link que enviamos antes de entrar.",
  user_already_exists: "Já existe uma conta com esse e-mail. Entre com a sua senha.",
  weak_password: "Senha fraca. Use pelo menos 8 caracteres, com letras e números.",
  over_email_send_rate_limit: "Muitos e-mails em pouco tempo. Espere um minuto e tente de novo.",
};

/** Entrar com senha, criar conta, entrar com código ou recuperar a senha. */
export function FormularioEntrar({ destino, erroInicial, modoInicial = "entrar" }: { destino: string; erroInicial?: string; modoInicial?: Modo }) {
  const router = useRouter();
  const [modo, setModo] = useState<Modo>(modoInicial);
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [verSenha, setVerSenha] = useState(false);
  const [celular, setCelular] = useState("");
  const [canal, setCanal] = useState<"email" | "celular">("email");
  const [enviadoPara, setEnviadoPara] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [codigo, setCodigo] = useState("");
  const [erro, setErro] = useState<string | null>(erroInicial ?? null);
  const [ocupado, setOcupado] = useState(false);

  const retorno = (caminho: string) => `${window.location.origin}/auth/callback?voltar=${encodeURIComponent(caminho)}`;
  const mensagemErro = (e: { code?: string; message: string }) => ERROS[e.code ?? ""] ?? "Não deu certo. Confira os dados e tente de novo.";

  function trocar(m: Modo) {
    setModo(m);
    setErro(null);
    setAviso(null);
    setEnviadoPara(null);
    setCodigo("");
  }

  async function concluir() {
    router.replace(destino as never);
    router.refresh();
  }

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setOcupado(true);
    const { error } = await supabaseNavegador().auth.signInWithPassword({ email: email.trim().toLowerCase(), password: senha });
    setOcupado(false);
    if (error) return setErro(mensagemErro(error));
    concluir();
  }

  async function criar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (senha.length < 8) return setErro("A senha precisa ter pelo menos 8 caracteres.");
    setOcupado(true);
    const { data, error } = await supabaseNavegador().auth.signUp({
      email: email.trim().toLowerCase(),
      password: senha,
      options: { emailRedirectTo: retorno(destino) },
    });
    setOcupado(false);
    if (error) return setErro(mensagemErro(error));
    // Com a confirmação de e-mail ligada, a sessão só nasce depois do clique no link.
    if (data.session) return concluir();
    if (data.user && !data.user.identities?.length) return setErro(ERROS.user_already_exists!);
    setAviso(`Enviamos um link de confirmação para ${email.trim().toLowerCase()}. Abra o e-mail neste aparelho para ativar a conta.`);
  }

  async function esqueci(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setOcupado(true);
    const { error } = await supabaseNavegador().auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo: retorno("/nova-senha") });
    setOcupado(false);
    if (error) return setErro(mensagemErro(error));
    setAviso(`Se existir uma conta com ${email.trim().toLowerCase()}, enviamos um link para criar uma senha nova.`);
  }

  async function enviarCodigo(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    const alvo = canal === "celular" ? normalizarCelular(celular) : email.trim().toLowerCase();
    if (!alvo || (canal === "email" && !alvo.includes("@"))) return setErro(canal === "celular" ? "Informe um celular com DDD." : "Informe um e-mail válido.");
    setOcupado(true);
    const supabase = supabaseNavegador();
    const { error } =
      canal === "celular"
        ? await supabase.auth.signInWithOtp({ phone: alvo })
        : await supabase.auth.signInWithOtp({ email: alvo, options: { emailRedirectTo: retorno(destino) } });
    setOcupado(false);
    if (error) return setErro(mensagemErro(error));
    setEnviadoPara(alvo);
  }

  async function verificarCodigo(e: React.FormEvent) {
    e.preventDefault();
    if (!enviadoPara) return;
    setErro(null);
    setOcupado(true);
    const supabase = supabaseNavegador();
    const token = codigo.replace(/\D/g, "");
    const { error } =
      canal === "celular"
        ? await supabase.auth.verifyOtp({ phone: enviadoPara, token, type: "sms" })
        : await supabase.auth.verifyOtp({ email: enviadoPara, token, type: "email" });
    setOcupado(false);
    if (error) return setErro("Código inválido ou expirado.");
    concluir();
  }

  const campoEmail = (
    <Campo rotulo="E-mail">
      <input className={classeEntrada} type="email" inputMode="email" autoComplete="email" placeholder="voce@exemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
    </Campo>
  );
  const campoSenha = (autocomplete: string) => (
    <Campo rotulo="Senha" dica={modo === "criar" ? "Pelo menos 8 caracteres." : undefined}>
      <span className="relative block">
        <input className={`${classeEntrada} pr-11`} type={verSenha ? "text" : "password"} autoComplete={autocomplete} value={senha} onChange={(e) => setSenha(e.target.value)} required minLength={modo === "criar" ? 8 : undefined} />
        <button type="button" onClick={() => setVerSenha((v) => !v)} aria-label={verSenha ? "Esconder senha" : "Mostrar senha"} className="absolute top-1/2 right-2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-suave hover:bg-cartao-2">
          {verSenha ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </span>
    </Campo>
  );
  const link = (rotulo: string, m: Modo) => (
    <button type="button" className="font-semibold text-marca" onClick={() => trocar(m)}>{rotulo}</button>
  );

  if (aviso) {
    return (
      <div className="flex flex-col items-center gap-3 py-2 text-center">
        <span className="grid size-12 place-items-center rounded-full bg-marca-suave text-marca"><MailCheck size={24} /></span>
        <p className="text-sm">{aviso}</p>
        <p className="text-xs text-suave">Não chegou? Veja a caixa de spam ou tente de novo em um minuto.</p>
        <button type="button" className="mt-1 text-sm font-semibold text-marca" onClick={() => trocar("entrar")}>Voltar para entrar</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {modo !== "esqueci" && (
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-cartao-2 p-1" role="tablist">
          {(["entrar", "criar"] as const).map((m) => (
            <button key={m} type="button" role="tab" aria-selected={modo === m || (m === "entrar" && modo === "codigo")} onClick={() => trocar(m)}
              className={`rounded-lg py-2 text-sm font-semibold transition-colors ${modo === m || (m === "entrar" && modo === "codigo") ? "bg-cartao text-texto shadow-cartao" : "text-suave"}`}>
              {m === "entrar" ? "Entrar" : "Criar conta"}
            </button>
          ))}
        </div>
      )}

      {erro && <Aviso tom="perigo">{erro}</Aviso>}

      {modo === "entrar" && (
        <form onSubmit={entrar} className="flex flex-col gap-4">
          {campoEmail}
          {campoSenha("current-password")}
          <Botao tamanho="lg" disabled={ocupado}>{ocupado ? "Entrando…" : "Entrar"}</Botao>
          <div className="flex justify-between text-sm">{link("Esqueci a senha", "esqueci")}{link("Entrar com código", "codigo")}</div>
        </form>
      )}

      {modo === "criar" && (
        <form onSubmit={criar} className="flex flex-col gap-4">
          {campoEmail}
          {campoSenha("new-password")}
          <Botao tamanho="lg" disabled={ocupado}>{ocupado ? "Criando…" : "Criar conta"}</Botao>
          <p className="text-center text-xs text-suave">Enviamos um link para confirmar o e-mail.</p>
        </form>
      )}

      {modo === "esqueci" && (
        <form onSubmit={esqueci} className="flex flex-col gap-4">
          <p className="text-sm text-suave">Informe o e-mail da conta. Enviamos um link para você criar uma senha nova.</p>
          {campoEmail}
          <Botao tamanho="lg" disabled={ocupado}>{ocupado ? "Enviando…" : "Enviar link"}</Botao>
          <p className="text-center text-sm">{link("Voltar para entrar", "entrar")}</p>
        </form>
      )}

      {modo === "codigo" && !enviadoPara && (
        <form onSubmit={enviarCodigo} className="flex flex-col gap-4">
          <div className="flex gap-4 text-sm">
            {(["email", "celular"] as const).map((c) => (
              <label key={c} className="flex items-center gap-2"><input type="radio" checked={canal === c} onChange={() => setCanal(c)} /> {c === "email" ? "Por e-mail" : "Por SMS"}</label>
            ))}
          </div>
          {canal === "email" ? campoEmail : (
            <Campo rotulo="Celular com DDD">
              <input className={classeEntrada} type="tel" inputMode="tel" autoComplete="tel-national" placeholder="(31) 99999-9999" value={celular} onChange={(e) => setCelular(e.target.value)} required />
            </Campo>
          )}
          <Botao tamanho="lg" disabled={ocupado}>{ocupado ? "Enviando…" : "Receber código"}</Botao>
          <p className="text-center text-sm">{link("Entrar com senha", "entrar")}</p>
        </form>
      )}

      {modo === "codigo" && enviadoPara && (
        <form onSubmit={verificarCodigo} className="flex flex-col gap-4">
          <p className="text-sm">Enviamos um código para <strong>{enviadoPara}</strong>. Se chegar um link, é só tocar nele neste aparelho.</p>
          <Campo rotulo="Código">
            <input className={`${classeEntrada} h-13 text-center text-2xl font-bold tracking-[0.4em]`} inputMode="numeric" autoComplete="one-time-code" maxLength={8} value={codigo} onChange={(e) => setCodigo(e.target.value)} autoFocus />
          </Campo>
          <Botao tamanho="lg" disabled={ocupado || codigo.replace(/\D/g, "").length < 6}>{ocupado ? "Verificando…" : "Entrar"}</Botao>
          <p className="text-center text-sm">{link("Usar outro e-mail", "codigo")}</p>
        </form>
      )}
    </div>
  );
}
