import { Marca } from "@/components/ui";
import { exigirUsuario } from "@/lib/sessao";
import { FormularioNovaSenha } from "./formulario";

/** Destino do link "Esqueci a senha": a pessoa já chega logada e define a senha nova. */
export default async function NovaSenha() {
  const usuario = await exigirUsuario("/nova-senha");
  return (
    <main className="grid min-h-dvh place-items-center bg-fundo px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center"><Marca /></div>
        <div className="rounded-[1.5rem] border border-borda bg-cartao p-6 shadow-flutuante">
          <h1 className="text-xl font-extrabold tracking-tight">Criar senha nova</h1>
          <p className="mt-1 mb-5 text-sm text-suave">Conta {usuario.email}</p>
          <FormularioNovaSenha />
        </div>
      </div>
    </main>
  );
}
