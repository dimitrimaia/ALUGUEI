import { ProvedorConta } from "@/components/conta/contexto";
import { AbasMotorista } from "@/components/motorista/abas";
import { perfilDaConta } from "@/lib/conta";
import { conversasNaoLidasDoMotorista } from "@/lib/conversas";
import { exigirUsuario } from "@/lib/sessao";

/** Casca do app do motorista: pensado para celular, centralizado em telas maiores. */
export default async function LayoutMotorista({ children }: { children: React.ReactNode }) {
  const usuario = await exigirUsuario("/m");
  const [perfil, naoLidas] = await Promise.all([perfilDaConta(), conversasNaoLidasDoMotorista(usuario.id).catch(() => 0)]);
  const valor = {
    perfil: { nome: perfil?.nome ?? "Sua conta", foto: perfil?.foto ?? null, detalhe: perfil?.email ?? perfil?.telefone ?? "Motorista" },
    naoLidas,
  };
  return (
    <ProvedorConta valor={valor} tema={perfil?.preferencias.tema ?? "claro"}>
      <div className="min-h-dvh bg-fundo sm:py-6">
        <main className="pb-barra mx-auto min-h-dvh max-w-[30rem] bg-fundo px-4 sm:min-h-0 sm:overflow-hidden sm:rounded-[2rem] sm:border sm:border-borda sm:shadow-flutuante">
          {children}
        </main>
        <AbasMotorista />
      </div>
    </ProvedorConta>
  );
}
