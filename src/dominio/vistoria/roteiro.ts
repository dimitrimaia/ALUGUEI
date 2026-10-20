/**
 * Roteiro da vistoria (RF-040, RF-041): ângulos obrigatórios de foto e itens
 * do checklist. Fica no código por enquanto; a configuração por locador vem
 * depois, sem mudar o formato salvo.
 */
export const FOTOS_VISTORIA = [
  { id: "frente", rotulo: "Frente", dica: "De frente, com a placa visível" },
  { id: "traseira", rotulo: "Traseira", dica: "De trás, com a placa visível" },
  { id: "lateral_esquerda", rotulo: "Lateral esquerda", dica: "O carro inteiro no quadro" },
  { id: "lateral_direita", rotulo: "Lateral direita", dica: "O carro inteiro no quadro" },
  { id: "painel", rotulo: "Painel ligado", dica: "Km e combustível legíveis" },
  { id: "interior_frente", rotulo: "Bancos da frente", dica: "Bancos e volante" },
  { id: "interior_tras", rotulo: "Banco de trás", dica: "Bancos e tapetes" },
  { id: "porta_malas", rotulo: "Porta-malas", dica: "Com estepe, macaco e triângulo" },
] as const;

export const ITENS_CHECKLIST = [
  { id: "lataria", rotulo: "Lataria e pintura" },
  { id: "vidros", rotulo: "Vidros e retrovisores" },
  { id: "farois", rotulo: "Faróis e lanternas" },
  { id: "pneus", rotulo: "Pneus" },
  { id: "interior", rotulo: "Bancos e acabamento interno" },
  { id: "estepe", rotulo: "Estepe" },
  { id: "macaco", rotulo: "Macaco e chave de roda" },
  { id: "triangulo", rotulo: "Triângulo" },
  { id: "documento", rotulo: "Documento (CRLV)" },
  { id: "chave", rotulo: "Chave" },
] as const;

export type IdFoto = (typeof FOTOS_VISTORIA)[number]["id"];
export type IdItem = (typeof ITENS_CHECKLIST)[number]["id"];
export type EstadoItem = "ok" | "avaria" | "ausente";

export interface ItemVistoria {
  item: IdItem;
  estado: EstadoItem;
  observacao?: string;
}

/** Formato salvo em vistorias.checklist. */
export interface ChecklistVistoria {
  fotos: Partial<Record<IdFoto, string>>; // id da evidência
  fotosExtras: string[];
  itens: ItemVistoria[];
  observacoes?: string;
}

export function faltando(c: ChecklistVistoria): { fotos: IdFoto[]; itens: IdItem[]; observacoesObrigatorias: IdItem[] } {
  return {
    fotos: FOTOS_VISTORIA.map((f) => f.id).filter((id) => !c.fotos[id]),
    itens: ITENS_CHECKLIST.map((i) => i.id).filter((id) => !c.itens.some((x) => x.item === id)),
    // Avaria ou item ausente precisa ser descrito: é o que vale na devolução.
    observacoesObrigatorias: c.itens.filter((x) => x.estado !== "ok" && !x.observacao?.trim()).map((x) => x.item),
  };
}

export function combustivelPorExtenso(oitavos: number): string {
  if (oitavos <= 0) return "Reserva";
  if (oitavos >= 8) return "Cheio";
  const nomes: Record<number, string> = { 2: "1/4", 4: "1/2", 6: "3/4" };
  return nomes[oitavos] ?? `${oitavos}/8`;
}
