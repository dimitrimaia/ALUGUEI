import { CabecalhoMotorista } from "@/components/motorista/cabecalho";
import { FormFecharDia } from "@/components/plantao/financas";
import { diaOperacional } from "@/dominio/ganhos/financas";
import { configPlantao } from "@/lib/plantao";
import { exigirUsuario } from "@/lib/sessao";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const metadata = { title: "Fechar o dia" };

/** Fechar o dia: já vem preenchido com as corridas aceitas hoje no Copiloto. */
export default async function FecharDia() {
  const usuario = await exigirUsuario("/m/plantao/fechar");
  const { financas } = await configPlantao(usuario.id);
  const dia = diaOperacional(financas.virada);
  const { data } = await supabaseAdmin().from("corridas_avaliadas").select("*").eq("usuario_id", usuario.id).eq("decisao", "aceitei").gte("ocorrida_em", `${dia}T00:00:00-03:00`);
  const sugestao: Record<string, { valor: number; corridas: number }> = {};
  for (const c of data ?? []) {
    const app = c.app && ["uber", "99", "indrive"].includes(c.app) ? c.app : "outra";
    const s = (sugestao[app] ??= { valor: 0, corridas: 0 });
    s.valor += (c as { valor_final_centavos?: number | null }).valor_final_centavos ?? c.valor_centavos;
    s.corridas += 1;
  }
  return (
    <div>
      <CabecalhoMotorista titulo="Fechar o dia" voltar="/m/plantao/financas" />
      <FormFecharDia sugestao={sugestao} />
    </div>
  );
}
