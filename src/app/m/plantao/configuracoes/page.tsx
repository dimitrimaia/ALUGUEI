import { Sparkles, Bell, Bookmark, Camera, Car, ChevronRight, Clock, Home, LayoutTemplate, LifeBuoy, MessageSquareText, Navigation, PiggyBank, Power, SlidersHorizontal } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { CabecalhoMotorista } from "@/components/motorista/cabecalho";
import { exigirUsuario } from "@/lib/sessao";

export const metadata = { title: "Configurações do Copiloto" };

type Item = { href: string; titulo: string; detalhe: string; icone: typeof Bell };

/** Todas as configurações do Copiloto num lugar só, cada uma levando direto à tela (ou ao trecho) certo. */
const GRUPOS: { titulo: string; itens: Item[] }[] = [
  {
    titulo: "Ligar e permissões",
    itens: [
      { href: "/m/plantao/assistente", titulo: "Assistente de configuração", detalhe: "Passo a passo com tudo explicado", icone: Sparkles },
      { href: "/m/plantao/semaforo", titulo: "Ligar o Copiloto", detalhe: "Bolha, leitura das ofertas e permissões", icone: Power },
      { href: "/m/plantao/ajuda", titulo: "Diagnóstico e ajuda", detalhe: "Ver o que o Copiloto está lendo e resolver problemas", icone: LifeBuoy },
    ],
  },
  {
    titulo: "O que é corrida boa",
    itens: [
      { href: "/m/plantao/regua", titulo: "Régua", detalhe: "Mínimos por km e por hora, embarque, distância e volta", icone: SlidersHorizontal },
      { href: "/m/plantao/regua", titulo: "Perfis de régua", detalhe: "Dia, Noite, Aeroporto: troque com um toque", icone: Bookmark },
      { href: "/m/plantao/custos", titulo: "Custos do carro", detalhe: "Combustível, aluguel e manutenção para calcular o lucro", icone: Car },
    ],
  },
  {
    titulo: "Cartão e avisos",
    itens: [
      { href: "/m/plantao/copiloto#cartao", titulo: "Cartão da oferta", detalhe: "Campos, estilo, tamanho e fixar no centro", icone: LayoutTemplate },
      { href: "/m/plantao/copiloto#avisos", titulo: "Avisos", detalhe: "Vibrar, bip, voz, perguntar se aceitou, economia", icone: Bell },
      { href: "/m/plantao/copiloto#navegacao", titulo: "App de navegação", detalhe: "Waze, Google Maps ou outro", icone: Navigation },
      { href: "/m/plantao/copiloto#base", titulo: "Base (casa)", detalhe: "Para contar a volta para casa", icone: Home },
      { href: "/m/plantao/copiloto#mensagem", titulo: "Mensagem pronta", detalhe: "Texto para o passageiro depois de aceitar", icone: MessageSquareText },
      { href: "/m/plantao/copiloto#seguranca", titulo: "Câmera e print", detalhe: "Gravar a corrida e guardar foto de cada oferta", icone: Camera },
    ],
  },
  {
    titulo: "Dinheiro e tempo",
    itens: [
      { href: "/m/plantao/financas", titulo: "Finanças", detalhe: "Meta do mês e reserva", icone: PiggyBank },
      { href: "/m/plantao/horarios", titulo: "Melhores horários", detalhe: "Quando rende mais rodar", icone: Clock },
    ],
  },
];

export default async function ConfiguracoesCopiloto() {
  await exigirUsuario("/m/plantao/configuracoes");
  return (
    <div className="flex flex-col gap-5">
      <CabecalhoMotorista titulo="Configurações do Copiloto" voltar="/m/plantao/semaforo" />
      {GRUPOS.map((g) => (
        <section key={g.titulo}>
          <h2 className="mb-2 px-1 text-xs font-semibold tracking-wide text-suave uppercase">{g.titulo}</h2>
          <div className="divide-y divide-borda overflow-hidden rounded-[1.1rem] border border-borda bg-cartao shadow-cartao">
            {g.itens.map(({ href, titulo, detalhe, icone: Icone }) => (
              <Link key={titulo} href={href as Route} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-cartao-2 active:bg-cartao-2">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-marca-suave text-marca"><Icone size={18} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{titulo}</span>
                  <span className="block truncate text-xs text-suave">{detalhe}</span>
                </span>
                <ChevronRight size={17} className="shrink-0 text-suave" />
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
