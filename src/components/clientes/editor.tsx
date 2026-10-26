"use client";

import { Copy, Plus, Save, Share2, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { EntradaReais, Rotulo } from "@/components/plantao/entradas";
import { Aviso, Botao, Cartao, classeAreaTexto, classeEntrada } from "@/components/ui";
import { formatarBRL } from "@/dominio/dinheiro/centavos";
import { estimarParticular, paraSlug, TABELA_PADRAO, type TabelaParticular } from "@/dominio/ganhos/particular";
import { salvarPerfilParticular } from "@/lib/acoes-clientes";

type Perfil = { slug: string; nome: string; cidade: string; whatsapp: string; apresentacao: string; tabelas: TabelaParticular[]; ativo: boolean };

export function EditorClientes({ inicial, salvo, site }: { inicial: Perfil; salvo: boolean; site: string }) {
  const [p, setP] = useState(inicial);
  const [estado, setEstado] = useState<{ erro?: string; ok?: boolean }>({});
  const [publicado, setPublicado] = useState(salvo ? inicial.slug : null);
  const [copiado, setCopiado] = useState(false);
  const [salvando, iniciar] = useTransition();
  const mudar = (x: Partial<Perfil>) => (setEstado({}), setP((a) => ({ ...a, ...x })));
  const mudarTabela = (i: number, x: Partial<TabelaParticular>) => mudar({ tabelas: p.tabelas.map((t, j) => (j === i ? { ...t, ...x } : t)) });
  const link = publicado ? `${site}/c/${publicado}` : null;

  return (
    <div className="flex flex-col gap-4">
      {link && (
        <section className="fundo-marca rounded-[1.4rem] p-5 text-white shadow-flutuante">
          <p className="text-sm text-white/75">Seu link para clientes</p>
          <p className="mt-1 text-lg font-bold break-all">{link.replace(/^https?:\/\//, "")}</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Botao variante="claro" icone={Copy} onClick={() => navigator.clipboard.writeText(link).then(() => setCopiado(true))}>{copiado ? "Copiado!" : "Copiar"}</Botao>
            <Botao variante="vidro" icone={Share2} onClick={() => (navigator.share ? navigator.share({ title: `Corridas com ${p.nome}`, text: "Agende sua corrida comigo, com preço na hora:", url: link }).catch(() => null) : navigator.clipboard.writeText(link))}>Compartilhar</Botao>
          </div>
          <p className="mt-3 text-xs text-white/75">Mande para quem já andou com você, coloque na bio e no status. O cliente vê o preço na hora e agenda pelo seu WhatsApp, sem taxa de app.</p>
        </section>
      )}

      <Cartao className="flex flex-col gap-3">
        <h2 className="font-bold">Sua página</h2>
        <Rotulo texto="Link" dica={`${site.replace(/^https?:\/\//, "")}/c/${paraSlug(p.slug) || "seu-nome"}`}>
          <input value={p.slug} onChange={(e) => mudar({ slug: e.target.value })} placeholder="seu-nome" className={classeEntrada} />
        </Rotulo>
        <div className="grid grid-cols-2 gap-3">
          <Rotulo texto="Nome que aparece"><input value={p.nome} onChange={(e) => mudar({ nome: e.target.value })} className={classeEntrada} /></Rotulo>
          <Rotulo texto="Cidade"><input value={p.cidade} onChange={(e) => mudar({ cidade: e.target.value })} placeholder="Ex.: Campinas, SP" className={classeEntrada} /></Rotulo>
        </div>
        <Rotulo texto="Seu WhatsApp" dica="Os pedidos chegam aqui, com a mensagem pronta."><input value={p.whatsapp} inputMode="tel" onChange={(e) => mudar({ whatsapp: e.target.value })} placeholder="(19) 99999-9999" className={classeEntrada} /></Rotulo>
        <Rotulo texto="Apresentação" dica="Opcional. Ex.: carro com ar, água e carregador. Atendo aeroporto e viagens."><textarea value={p.apresentacao} onChange={(e) => mudar({ apresentacao: e.target.value })} rows={3} maxLength={300} className={classeAreaTexto} /></Rotulo>
        <label className="flex items-center justify-between gap-3 rounded-xl bg-cartao-2 px-3 py-2.5 text-sm font-medium">
          Página no ar
          <input type="checkbox" checked={p.ativo} onChange={(e) => mudar({ ativo: e.target.checked })} className="size-5 accent-[var(--marca)]" />
        </label>
      </Cartao>

      <Cartao className="flex flex-col gap-3">
        <div>
          <h2 className="font-bold">Tabela de preços</h2>
          <p className="text-xs text-suave">Preço = base + km + minutos, nunca abaixo do mínimo. Exemplo de 10 km em 20 min ao lado de cada categoria.</p>
        </div>
        {p.tabelas.map((t, i) => (
          <div key={i} className="flex flex-col gap-2 rounded-xl bg-cartao-2 p-3">
            <div className="flex items-center gap-2">
              <input aria-label="Categoria" value={t.nome} onChange={(e) => mudarTabela(i, { nome: e.target.value })} className="h-9 min-w-0 flex-1 rounded-lg border border-borda bg-cartao px-2.5 text-sm font-semibold outline-none focus:border-marca" />
              <span className="text-xs font-semibold text-suave tabular-nums">10 km: {formatarBRL(estimarParticular(10, 20, t))}</span>
              {p.tabelas.length > 1 && <button type="button" aria-label={`Remover ${t.nome}`} onClick={() => mudar({ tabelas: p.tabelas.filter((_, j) => j !== i) })} className="grid size-9 place-items-center rounded-full text-suave hover:bg-cartao"><Trash2 size={16} /></button>}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Rotulo texto="Base"><EntradaReais rotulo={`Base ${t.nome}`} valor={t.tarifaBase} aoMudar={(v) => mudarTabela(i, { tarifaBase: v ?? 0 })} /></Rotulo>
              <Rotulo texto="Por km"><EntradaReais rotulo={`Por km ${t.nome}`} valor={t.porKm} aoMudar={(v) => mudarTabela(i, { porKm: v ?? 0 })} /></Rotulo>
              <Rotulo texto="Por minuto"><EntradaReais rotulo={`Por minuto ${t.nome}`} valor={t.porMinuto} aoMudar={(v) => mudarTabela(i, { porMinuto: v ?? 0 })} /></Rotulo>
              <Rotulo texto="Mínimo"><EntradaReais rotulo={`Mínimo ${t.nome}`} valor={t.minimo} aoMudar={(v) => mudarTabela(i, { minimo: v ?? 0 })} /></Rotulo>
            </div>
          </div>
        ))}
        {p.tabelas.length < 5 && <button type="button" onClick={() => mudar({ tabelas: [...p.tabelas, { ...TABELA_PADRAO, nome: p.tabelas.length ? "Executivo" : "Carro" }] })} className="inline-flex h-9 items-center gap-1 self-start rounded-full border border-dashed border-borda-forte px-3 text-xs font-semibold text-suave hover:text-texto"><Plus size={14} /> Categoria</button>}
      </Cartao>

      {estado.erro && <Aviso tom="perigo">{estado.erro}</Aviso>}
      {estado.ok && <Aviso tom="ok">Página salva.</Aviso>}
      <Botao
        tamanho="lg"
        icone={Save}
        disabled={salvando}
        className="w-full"
        onClick={() =>
          iniciar(async () => {
            const r = await salvarPerfilParticular(p);
            setEstado(r);
            if (r.slug) {
              setPublicado(r.slug);
              setP((a) => ({ ...a, slug: r.slug! }));
            }
          })
        }
      >
        {salvando ? "Salvando…" : publicado ? "Salvar" : "Criar minha página"}
      </Botao>
    </div>
  );
}
