import Link from "next/link";
import { Cartao, Selo, Suave, Titulo, Vazio } from "@/components/ui";
import { formatarPlaca } from "@/dominio/cadastro/documentos";
import { data, formatarData } from "@/dominio/datas/data";
import { exigirEquipe } from "@/lib/sessao";
import { STATUS_CONTRATO } from "@/lib/rotulos";
import { supabaseServidor } from "@/lib/supabase/servidor";

export default async function Contratos() {
  const { organizacao } = await exigirEquipe();
  const supabase = await supabaseServidor();
  const [{ data: contratos }, { data: locatarios }, { data: veiculos }] = await Promise.all([
    supabase.from("contratos").select("id, status, inicio, fim, locatario_id, veiculo_id").eq("organizacao_id", organizacao.id).order("criado_em", { ascending: false }),
    supabase.from("locatarios").select("id, nome").eq("organizacao_id", organizacao.id),
    supabase.from("veiculos").select("id, placa, modelo").eq("organizacao_id", organizacao.id),
  ]);
  const nome = (id: string) => locatarios?.find((l) => l.id === id)?.nome ?? "—";
  const carro = (id: string) => {
    const v = veiculos?.find((x) => x.id === id);
    return v ? `${formatarPlaca(v.placa)} · ${v.modelo}` : "—";
  };

  return (
    <>
      <Titulo>Contratos</Titulo>
      {!contratos?.length ? (
        <Vazio>Nenhum contrato ainda. Aprove um motorista e gere o contrato pela ficha dele.</Vazio>
      ) : (
        <ul className="grid gap-3">
          {contratos.map((c) => (
            <li key={c.id}>
              <Link href={`/painel/contratos/${c.id}`}>
                <Cartao className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold">{nome(c.locatario_id)}</p>
                    <Suave>{carro(c.veiculo_id)} · {formatarData(data(c.inicio))} a {formatarData(data(c.fim))}</Suave>
                  </div>
                  <Selo tom={STATUS_CONTRATO[c.status].tom}>{STATUS_CONTRATO[c.status].rotulo}</Selo>
                </Cartao>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
