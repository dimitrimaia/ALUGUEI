import { AtualizarApp } from "@/components/atualizar-app";
import { ProvedorConta } from "@/components/conta/contexto";
import { NavegacaoMotorista } from "@/components/motorista/abas";
import { RegistrarMenuMotorista } from "@/components/motorista/menu";
import { perfilResumido } from "@/lib/conta";
import { conversasNaoLidasDoMotorista } from "@/lib/conversas";
import { locadoraDoUsuario } from "@/lib/modos";
import { avisosNaoLidos } from "@/lib/notificacoes";
import { exigirUsuario } from "@/lib/sessao";

/** Casca do modo motorista: rodapé com o Copiloto no meio no celular; lateral e barra de cima no computador (igual ao locador). */
export default async function LayoutMotorista({ children }: { children: React.ReactNode }) {
  const usuario = await exigirUsuario("/m");
  const [perfil, naoLidas, locadora, notificacoes] = await Promise.all([
    perfilResumido(),
    conversasNaoLidasDoMotorista(usuario.id).catch(() => 0),
    locadoraDoUsuario(usuario.id),
    avisosNaoLidos(usuario.id).catch(() => 0),
  ]);
  const valor = {
    perfil: { nome: perfil?.nome ?? "Sua conta", foto: perfil?.foto ?? null, detalhe: perfil?.email ?? perfil?.telefone ?? "" },
    naoLidas,
    modo: "motorista" as const,
    locadora: locadora?.nome ?? null,
    avisos: naoLidas + notificacoes,
    notificacoes,
  };
  return (
    <ProvedorConta valor={valor} tema={perfil?.tema ?? "claro"}>
      <div className="min-h-dvh bg-fundo lg:flex">
        <NavegacaoMotorista />
        <main className="pb-barra mx-auto w-full max-w-[30rem] px-4 sm:max-w-[40rem] lg:max-w-[60rem] lg:px-10 lg:pt-24 lg:pb-14">
          {children}
        </main>
        <AtualizarApp />
        <RegistrarMenuMotorista />
      </div>
    </ProvedorConta>
  );
}
