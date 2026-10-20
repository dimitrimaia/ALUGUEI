/** Porta de assinatura eletrônica (RF-032, RNF-012). Adaptador inicial: ZapSign. */
export interface ProvedorAssinatura {
  readonly nome: string;
  enviarParaAssinatura(dados: {
    referenciaExterna: string;
    pdf: Uint8Array;
    signatarios: { nome: string; telefone: string; email?: string; papel: "locador" | "locatario" }[];
  }): Promise<{ documentoId: string; links: Record<string, string> }>;
  /** PDF assinado + trilha de evidências (IP, dispositivo, data/hora, hash). */
  baixarAssinado(documentoId: string): Promise<{ pdf: Uint8Array; trilha: Uint8Array }>;
}
