import { redirect } from "next/navigation";
import { aluguelExterno } from "@/lib/aluguel-externo";
import { exigirUsuario } from "@/lib/sessao";

/** Endereço antigo: leva para o carro em uso (ou para cadastrar um). */
export default async function EditarAntigo() {
  const usuario = await exigirUsuario("/m/plantao/aluguel/editar");
  const a = await aluguelExterno(usuario.id);
  redirect(a ? `/m/plantao/aluguel/${a.id}/editar` : "/m/plantao/aluguel/novo");
}
