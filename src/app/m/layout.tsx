import { ProvedorConta } from "@/components/conta/contexto";
import { AbasMotorista } from "@/components/motorista/abas";
import { RegistrarMenuMotorista } from "@/components/motorista/menu";
import { perfilResumido } from "@/lib/conta";
import { conversasNaoLidasDoMotorista } from "@/lib/conversas";
import { locadoraDoUsuario } from "@/lib/modos";
import { avisosNaoLidos } from "@/lib/notificacoes";
import { exigirUsuario } from "@/lib/sessao";

/** Casca do app no modo motorista (alugar carros): pensado para celular, centralizado em telas maiores. */
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
      <div className="min-h-dvh bg-fundo sm:py-6">
        <main className="pb-barra mx-auto min-h-dvh max-w-[30rem] bg-fundo px-4 sm:min-h-0 sm:overflow-hidden sm:rounded-[2rem] sm:border sm:border-borda sm:shadow-flutuante">
          {children}
        </main>
        <AbasMotorista />
        <RegistrarMenuMotorista />
      </div>
    </ProvedorConta>
  );
}
