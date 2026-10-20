/** Textos de consentimento (RF-006). Mudou o texto, muda a versão: o aceite antigo continua ligado à versão antiga. */
export const VERSAO_CONSENTIMENTO = "2026-10-1";

export const FINALIDADES = [
  {
    id: "documentos",
    titulo: "Uso de documentos",
    texto:
      "Autorizo o uso dos meus dados pessoais e documentos (CNH, identidade, comprovantes) para análise cadastral e para o contrato de locação.",
  },
  {
    id: "geolocalizacao",
    titulo: "Localização nas fotos",
    texto:
      "Autorizo o registro da localização do celular no momento das fotos de vistoria e de check-in, como prova do estado do veículo.",
  },
  {
    id: "compartilhamento_autoridades",
    titulo: "Informar autoridades",
    texto:
      "Estou ciente de que meus dados podem ser informados a autoridades em caso de multa de trânsito (indicação de condutor), sinistro ou ordem judicial.",
  },
] as const;

export type Finalidade = (typeof FINALIDADES)[number]["id"];
