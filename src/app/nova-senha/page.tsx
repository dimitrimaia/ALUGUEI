import { KeyRound, LinkIcon } from "lucide-react";
import { BotaoLink, Marca } from "@/components/ui";
import { usuarioAtual } from "@/lib/sessao";
import { FormularioNovaSenha } from "./formulario";

export const metadata = { title: "Criar senha nova", robots: { index: false } };

/** Recuperação de senha: o link do e-mail traz a pessoa já logada para definir a senha nova. */
export default async function NovaSenha() {
  const usuario = await usuarioAtual();
  return (
    <main className="tema-claro grid min-h-dvh place-items-center bg-fundo px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center"><Marca /></div>
        <div className="rounded-[1.5rem] border border-borda bg-cartao p-6 shadow-flutuante">
          {usuario ? (
            <>
              <span className="grid size-11 place-items-center rounded-2xl bg-marca-suave text-marca"><KeyRound size={22} /></span>
              <h1 className="mt-4 text-xl font-bold tracking-tight">Criar senha nova</h1>
              <p className="mt-1 mb-5 text-sm text-suave">Para a conta <strong className="text-texto">{usuario.email ?? usuario.telefone}</strong>.</p>
              <FormularioNovaSenha />
            </>
          ) : (
            <div className="flex flex-col items-center gap-3 text-center">
              <span className="grid size-12 place-items-center rounded-full bg-alerta-suave text-alerta"><LinkIcon size={22} /></span>
              <h1 className="text-lg font-bold">Link de senha expirado</h1>
              <p className="text-sm text-suave">O link vale uma vez só, por tempo limitado, e só o último pedido vale. Peça um novo para criar a senha.</p>
              <BotaoLink href="/entrar?modo=esqueci" tamanho="lg" className="mt-2 w-full">Pedir novo link</BotaoLink>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
