// Gerado por scripts/gerar-tipos.ts. Não edite à mão.
export type Json = string | number | boolean | null | { [k: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      acoes_pendentes: {
        Row: { id: string; organizacao_id: string; contrato_id: string | null; tipo: string; proposta: Json; motivo: string; status: string; decidido_por: string | null; decidido_em: string | null; criado_em: string };
        Insert: { id?: string; organizacao_id: string; contrato_id?: string | null; tipo: string; proposta: Json; motivo: string; status?: string; decidido_por?: string | null; decidido_em?: string | null; criado_em?: string };
        Update: { id?: string; organizacao_id?: string; contrato_id?: string | null; tipo?: string; proposta?: Json; motivo?: string; status?: string; decidido_por?: string | null; decidido_em?: string | null; criado_em?: string };
        Relationships: [];
      };
      anuncios: {
        Row: { id: string; organizacao_id: string; veiculo_id: string; status: "ativo" | "pausado"; cidade: string; uf: string; cidade_busca: string; aluguel_semanal_centavos: number; caucao_centavos: number; franquia_km_mensal: number; prazo_minimo_meses: number; descricao: string | null; fotos: Json; criado_em: string; atualizado_em: string };
        Insert: { id?: string; organizacao_id: string; veiculo_id: string; status?: "ativo" | "pausado"; cidade: string; uf: string; cidade_busca: string; aluguel_semanal_centavos: number; caucao_centavos: number; franquia_km_mensal: number; prazo_minimo_meses: number; descricao?: string | null; fotos?: Json; criado_em?: string; atualizado_em?: string };
        Update: { id?: string; organizacao_id?: string; veiculo_id?: string; status?: "ativo" | "pausado"; cidade?: string; uf?: string; cidade_busca?: string; aluguel_semanal_centavos?: number; caucao_centavos?: number; franquia_km_mensal?: number; prazo_minimo_meses?: number; descricao?: string | null; fotos?: Json; criado_em?: string; atualizado_em?: string };
        Relationships: [];
      };
      auditoria: {
        Row: { id: string; organizacao_id: string | null; usuario_id: string | null; acao: string; entidade: string; entidade_id: string | null; antes: Json | null; depois: Json | null; ip: string | null; criado_em: string };
        Insert: { id?: string; organizacao_id?: string | null; usuario_id?: string | null; acao: string; entidade: string; entidade_id?: string | null; antes?: Json | null; depois?: Json | null; ip?: string | null; criado_em?: string };
        Update: { id?: string; organizacao_id?: string | null; usuario_id?: string | null; acao?: string; entidade?: string; entidade_id?: string | null; antes?: Json | null; depois?: Json | null; ip?: string | null; criado_em?: string };
        Relationships: [];
      };
      checkins: {
        Row: { id: string; organizacao_id: string; contrato_id: string; obrigacao_id: string; referencia: string; odometro_informado: number | null; combustivel_oitavos: number | null; evidencias: Json; revisado_por: string | null; enviado_em: string };
        Insert: { id?: string; organizacao_id: string; contrato_id: string; obrigacao_id: string; referencia: string; odometro_informado?: number | null; combustivel_oitavos?: number | null; evidencias: Json; revisado_por?: string | null; enviado_em?: string };
        Update: { id?: string; organizacao_id?: string; contrato_id?: string; obrigacao_id?: string; referencia?: string; odometro_informado?: number | null; combustivel_oitavos?: number | null; evidencias?: Json; revisado_por?: string | null; enviado_em?: string };
        Relationships: [];
      };
      clientes_pagamento: {
        Row: { id: string; organizacao_id: string; locatario_id: string; provedor: string; cliente_id: string; criado_em: string };
        Insert: { id?: string; organizacao_id: string; locatario_id: string; provedor: string; cliente_id: string; criado_em?: string };
        Update: { id?: string; organizacao_id?: string; locatario_id?: string; provedor?: string; cliente_id?: string; criado_em?: string };
        Relationships: [];
      };
      cobrancas: {
        Row: { id: string; organizacao_id: string; contrato_id: string; obrigacao_id: string | null; provedor: string; provedor_id: string | null; valor_centavos: number; vencimento: string; split_plataforma_centavos: number; status: string; pix_copia_e_cola: string | null; pix_qr_code: string | null; valor_pago_centavos: number | null; link_pagamento: string | null; pago_em: string | null; criado_em: string };
        Insert: { id?: string; organizacao_id: string; contrato_id: string; obrigacao_id?: string | null; provedor: string; provedor_id?: string | null; valor_centavos: number; vencimento: string; split_plataforma_centavos?: number; status?: string; pix_copia_e_cola?: string | null; pix_qr_code?: string | null; valor_pago_centavos?: number | null; link_pagamento?: string | null; pago_em?: string | null; criado_em?: string };
        Update: { id?: string; organizacao_id?: string; contrato_id?: string; obrigacao_id?: string | null; provedor?: string; provedor_id?: string | null; valor_centavos?: number; vencimento?: string; split_plataforma_centavos?: number; status?: string; pix_copia_e_cola?: string | null; pix_qr_code?: string | null; valor_pago_centavos?: number | null; link_pagamento?: string | null; pago_em?: string | null; criado_em?: string };
        Relationships: [];
      };
      consentimentos: {
        Row: { id: string; organizacao_id: string; locatario_id: string; finalidade: string; versao_texto: string; aceito_em: string; ip: string | null; dispositivo: string | null; revogado_em: string | null };
        Insert: { id?: string; organizacao_id: string; locatario_id: string; finalidade: string; versao_texto: string; aceito_em?: string; ip?: string | null; dispositivo?: string | null; revogado_em?: string | null };
        Update: { id?: string; organizacao_id?: string; locatario_id?: string; finalidade?: string; versao_texto?: string; aceito_em?: string; ip?: string | null; dispositivo?: string | null; revogado_em?: string | null };
        Relationships: [];
      };
      contas_pagamento: {
        Row: { id: string; organizacao_id: string; provedor: string; conta_id: string; wallet_id: string; chave_api_cifrada: string; status: string; dados: Json | null; criado_em: string };
        Insert: { id?: string; organizacao_id: string; provedor: string; conta_id: string; wallet_id: string; chave_api_cifrada: string; status?: string; dados?: Json | null; criado_em?: string };
        Update: { id?: string; organizacao_id?: string; provedor?: string; conta_id?: string; wallet_id?: string; chave_api_cifrada?: string; status?: string; dados?: Json | null; criado_em?: string };
        Relationships: [];
      };
      contratos: {
        Row: { id: string; organizacao_id: string; locatario_id: string; veiculo_id: string; versao_modelo_id: string; parametros: Json; inicio: string; fim: string; status: "rascunho" | "aguardando_assinatura" | "assinado" | "ativo" | "encerrado" | "rescindido"; importado: boolean; pdf_evidencia_id: string | null; pdf_sha256: string | null; assinatura_provedor_id: string | null; assinado_em: string | null; contrato_anterior_id: string | null; criado_em: string };
        Insert: { id?: string; organizacao_id: string; locatario_id: string; veiculo_id: string; versao_modelo_id: string; parametros: Json; inicio: string; fim: string; status?: "rascunho" | "aguardando_assinatura" | "assinado" | "ativo" | "encerrado" | "rescindido"; importado?: boolean; pdf_evidencia_id?: string | null; pdf_sha256?: string | null; assinatura_provedor_id?: string | null; assinado_em?: string | null; contrato_anterior_id?: string | null; criado_em?: string };
        Update: { id?: string; organizacao_id?: string; locatario_id?: string; veiculo_id?: string; versao_modelo_id?: string; parametros?: Json; inicio?: string; fim?: string; status?: "rascunho" | "aguardando_assinatura" | "assinado" | "ativo" | "encerrado" | "rescindido"; importado?: boolean; pdf_evidencia_id?: string | null; pdf_sha256?: string | null; assinatura_provedor_id?: string | null; assinado_em?: string | null; contrato_anterior_id?: string | null; criado_em?: string };
        Relationships: [];
      };
      conversas: {
        Row: { id: string; organizacao_id: string; anuncio_id: string; usuario_id: string; nome_motorista: string; telefone_motorista: string; locatario_id: string | null; ultima_mensagem_em: string; lida_locador_em: string | null; lida_motorista_em: string | null; criado_em: string };
        Insert: { id?: string; organizacao_id: string; anuncio_id: string; usuario_id: string; nome_motorista: string; telefone_motorista: string; locatario_id?: string | null; ultima_mensagem_em?: string; lida_locador_em?: string | null; lida_motorista_em?: string | null; criado_em?: string };
        Update: { id?: string; organizacao_id?: string; anuncio_id?: string; usuario_id?: string; nome_motorista?: string; telefone_motorista?: string; locatario_id?: string | null; ultima_mensagem_em?: string; lida_locador_em?: string | null; lida_motorista_em?: string | null; criado_em?: string };
        Relationships: [];
      };
      evidencias: {
        Row: { id: string; organizacao_id: string; contrato_id: string | null; veiculo_id: string | null; locatario_id: string | null; tipo: string; finalidade: string; caminho_storage: string; sha256: string; tamanho_bytes: number; mime: string; recebido_em: string; capturado_em_dispositivo: string | null; latitude: number | null; longitude: number | null; precisao_metros: number | null; ip: string | null; dispositivo: string | null; enviado_por: string; metadados: Json | null };
        Insert: { id?: string; organizacao_id: string; contrato_id?: string | null; veiculo_id?: string | null; locatario_id?: string | null; tipo: string; finalidade: string; caminho_storage: string; sha256: string; tamanho_bytes: number; mime: string; recebido_em?: string; capturado_em_dispositivo?: string | null; latitude?: number | null; longitude?: number | null; precisao_metros?: number | null; ip?: string | null; dispositivo?: string | null; enviado_por: string; metadados?: Json | null };
        Update: { id?: string; organizacao_id?: string; contrato_id?: string | null; veiculo_id?: string | null; locatario_id?: string | null; tipo?: string; finalidade?: string; caminho_storage?: string; sha256?: string; tamanho_bytes?: number; mime?: string; recebido_em?: string; capturado_em_dispositivo?: string | null; latitude?: number | null; longitude?: number | null; precisao_metros?: number | null; ip?: string | null; dispositivo?: string | null; enviado_por?: string; metadados?: Json | null };
        Relationships: [];
      };
      itens_manutencao: {
        Row: { id: string; organizacao_id: string; veiculo_id: string; item: string; a_cada_km: number | null; a_cada_dias: number | null; ultima_execucao_km: number | null; ultima_execucao_em: string | null };
        Insert: { id?: string; organizacao_id: string; veiculo_id: string; item: string; a_cada_km?: number | null; a_cada_dias?: number | null; ultima_execucao_km?: number | null; ultima_execucao_em?: string | null };
        Update: { id?: string; organizacao_id?: string; veiculo_id?: string; item?: string; a_cada_km?: number | null; a_cada_dias?: number | null; ultima_execucao_km?: number | null; ultima_execucao_em?: string | null };
        Relationships: [];
      };
      lancamentos: {
        Row: { id: string; organizacao_id: string; contrato_id: string; tipo: "aluguel" | "caucao" | "multa_mora" | "juros_mora" | "correcao" | "km_excedente" | "cobranca_extra" | "lucros_cessantes" | "multa_transito" | "taxa_administracao" | "desconto" | "isencao" | "pagamento" | "estorno" | "uso_caucao" | "devolucao_caucao"; valor_centavos: number; competencia: string; descricao: string; justificativa: string | null; obrigacao_id: string | null; lancamento_origem_id: string | null; evidencia_ids: Json | null; chave: string; criado_por: string | null; aprovado_por: string | null; criado_em: string };
        Insert: { id?: string; organizacao_id: string; contrato_id: string; tipo: "aluguel" | "caucao" | "multa_mora" | "juros_mora" | "correcao" | "km_excedente" | "cobranca_extra" | "lucros_cessantes" | "multa_transito" | "taxa_administracao" | "desconto" | "isencao" | "pagamento" | "estorno" | "uso_caucao" | "devolucao_caucao"; valor_centavos: number; competencia: string; descricao: string; justificativa?: string | null; obrigacao_id?: string | null; lancamento_origem_id?: string | null; evidencia_ids?: Json | null; chave: string; criado_por?: string | null; aprovado_por?: string | null; criado_em?: string };
        Update: { id?: string; organizacao_id?: string; contrato_id?: string; tipo?: "aluguel" | "caucao" | "multa_mora" | "juros_mora" | "correcao" | "km_excedente" | "cobranca_extra" | "lucros_cessantes" | "multa_transito" | "taxa_administracao" | "desconto" | "isencao" | "pagamento" | "estorno" | "uso_caucao" | "devolucao_caucao"; valor_centavos?: number; competencia?: string; descricao?: string; justificativa?: string | null; obrigacao_id?: string | null; lancamento_origem_id?: string | null; evidencia_ids?: Json | null; chave?: string; criado_por?: string | null; aprovado_por?: string | null; criado_em?: string };
        Relationships: [];
      };
      leituras_odometro: {
        Row: { id: string; organizacao_id: string; veiculo_id: string; km: number; origem: string; origem_id: string | null; lido_em: string; criado_em: string };
        Insert: { id?: string; organizacao_id: string; veiculo_id: string; km: number; origem: string; origem_id?: string | null; lido_em: string; criado_em?: string };
        Update: { id?: string; organizacao_id?: string; veiculo_id?: string; km?: number; origem?: string; origem_id?: string | null; lido_em?: string; criado_em?: string };
        Relationships: [];
      };
      locatarios: {
        Row: { id: string; organizacao_id: string; usuario_id: string | null; nome: string; cpf: string | null; telefone: string; email: string | null; data_nascimento: string | null; endereco: Json | null; cnh_numero: string | null; cnh_primeira_habilitacao: string | null; cnh_validade: string | null; cnh_tem_ear: boolean | null; status: "convidado" | "em_cadastro" | "em_analise" | "aprovado" | "recusado"; pendencias_pre_analise: Json | null; motivo_decisao: string | null; decidido_por: string | null; decidido_em: string | null; token_convite: string | null; convite_expira_em: string | null; veiculo_ofertado_id: string | null; oferta: Json | null; criado_em: string };
        Insert: { id?: string; organizacao_id: string; usuario_id?: string | null; nome: string; cpf?: string | null; telefone: string; email?: string | null; data_nascimento?: string | null; endereco?: Json | null; cnh_numero?: string | null; cnh_primeira_habilitacao?: string | null; cnh_validade?: string | null; cnh_tem_ear?: boolean | null; status?: "convidado" | "em_cadastro" | "em_analise" | "aprovado" | "recusado"; pendencias_pre_analise?: Json | null; motivo_decisao?: string | null; decidido_por?: string | null; decidido_em?: string | null; token_convite?: string | null; convite_expira_em?: string | null; veiculo_ofertado_id?: string | null; oferta?: Json | null; criado_em?: string };
        Update: { id?: string; organizacao_id?: string; usuario_id?: string | null; nome?: string; cpf?: string | null; telefone?: string; email?: string | null; data_nascimento?: string | null; endereco?: Json | null; cnh_numero?: string | null; cnh_primeira_habilitacao?: string | null; cnh_validade?: string | null; cnh_tem_ear?: boolean | null; status?: "convidado" | "em_cadastro" | "em_analise" | "aprovado" | "recusado"; pendencias_pre_analise?: Json | null; motivo_decisao?: string | null; decidido_por?: string | null; decidido_em?: string | null; token_convite?: string | null; convite_expira_em?: string | null; veiculo_ofertado_id?: string | null; oferta?: Json | null; criado_em?: string };
        Relationships: [];
      };
      manutencoes: {
        Row: { id: string; organizacao_id: string; veiculo_id: string; descricao: string; km: number; realizada_em: string; custo_centavos: number; responsavel_custo: string; criado_em: string };
        Insert: { id?: string; organizacao_id: string; veiculo_id: string; descricao: string; km: number; realizada_em: string; custo_centavos: number; responsavel_custo?: string; criado_em?: string };
        Update: { id?: string; organizacao_id?: string; veiculo_id?: string; descricao?: string; km?: number; realizada_em?: string; custo_centavos?: number; responsavel_custo?: string; criado_em?: string };
        Relationships: [];
      };
      membros: {
        Row: { id: string; organizacao_id: string; usuario_id: string; papel: "dono" | "operador"; criado_em: string };
        Insert: { id?: string; organizacao_id: string; usuario_id: string; papel: "dono" | "operador"; criado_em?: string };
        Update: { id?: string; organizacao_id?: string; usuario_id?: string; papel?: "dono" | "operador"; criado_em?: string };
        Relationships: [];
      };
      mensagens: {
        Row: { id: string; conversa_id: string; autor: "motorista" | "locador" | "sistema"; usuario_id: string | null; texto: string; criado_em: string };
        Insert: { id?: string; conversa_id: string; autor: "motorista" | "locador" | "sistema"; usuario_id?: string | null; texto: string; criado_em?: string };
        Update: { id?: string; conversa_id?: string; autor?: "motorista" | "locador" | "sistema"; usuario_id?: string | null; texto?: string; criado_em?: string };
        Relationships: [];
      };
      modelos_contrato: {
        Row: { id: string; organizacao_id: string | null; nome: string; criado_em: string };
        Insert: { id?: string; organizacao_id?: string | null; nome: string; criado_em?: string };
        Update: { id?: string; organizacao_id?: string | null; nome?: string; criado_em?: string };
        Relationships: [];
      };
      notificacoes: {
        Row: { id: string; organizacao_id: string; contrato_id: string | null; destinatario_usuario_id: string | null; canal: "app" | "push" | "email" | "whatsapp"; formal: boolean; modelo: string; texto: string; chave: string; provedor_id: string | null; enviada_em: string | null; entregue_em: string | null; lida_em: string | null; falha: string | null; criado_em: string };
        Insert: { id?: string; organizacao_id: string; contrato_id?: string | null; destinatario_usuario_id?: string | null; canal: "app" | "push" | "email" | "whatsapp"; formal?: boolean; modelo: string; texto: string; chave: string; provedor_id?: string | null; enviada_em?: string | null; entregue_em?: string | null; lida_em?: string | null; falha?: string | null; criado_em?: string };
        Update: { id?: string; organizacao_id?: string; contrato_id?: string | null; destinatario_usuario_id?: string | null; canal?: "app" | "push" | "email" | "whatsapp"; formal?: boolean; modelo?: string; texto?: string; chave?: string; provedor_id?: string | null; enviada_em?: string | null; entregue_em?: string | null; lida_em?: string | null; falha?: string | null; criado_em?: string };
        Relationships: [];
      };
      obrigacoes: {
        Row: { id: string; organizacao_id: string; contrato_id: string; chave: string; tipo: "aluguel" | "caucao_parcela" | "checkin"; vencimento: string; valor_centavos: number | null; periodo_inicio: string | null; periodo_fim: string | null; status: "pendente" | "cumprida" | "atrasada" | "cancelada" | "isenta"; pagamento_informado_em: string | null; criado_em: string };
        Insert: { id?: string; organizacao_id: string; contrato_id: string; chave: string; tipo: "aluguel" | "caucao_parcela" | "checkin"; vencimento: string; valor_centavos?: number | null; periodo_inicio?: string | null; periodo_fim?: string | null; status?: "pendente" | "cumprida" | "atrasada" | "cancelada" | "isenta"; pagamento_informado_em?: string | null; criado_em?: string };
        Update: { id?: string; organizacao_id?: string; contrato_id?: string; chave?: string; tipo?: "aluguel" | "caucao_parcela" | "checkin"; vencimento?: string; valor_centavos?: number | null; periodo_inicio?: string | null; periodo_fim?: string | null; status?: "pendente" | "cumprida" | "atrasada" | "cancelada" | "isenta"; pagamento_informado_em?: string | null; criado_em?: string };
        Relationships: [];
      };
      organizacoes: {
        Row: { id: string; nome: string; documento: string; cidade: string; uf: string; subconta_pagamento_id: string | null; modo_assistido: boolean; mensalidade_por_carro_centavos: number; chave_pix_direto: string | null; criado_em: string };
        Insert: { id?: string; nome: string; documento: string; cidade: string; uf: string; subconta_pagamento_id?: string | null; modo_assistido?: boolean; mensalidade_por_carro_centavos?: number; chave_pix_direto?: string | null; criado_em?: string };
        Update: { id?: string; nome?: string; documento?: string; cidade?: string; uf?: string; subconta_pagamento_id?: string | null; modo_assistido?: boolean; mensalidade_por_carro_centavos?: number; chave_pix_direto?: string | null; criado_em?: string };
        Relationships: [];
      };
      veiculos: {
        Row: { id: string; organizacao_id: string; placa: string; modelo: string; ano_fabricacao: number | null; ano_modelo: number | null; cor: string | null; renavam: string | null; odometro_atual: number; status: "disponivel" | "alugado" | "em_manutencao" | "em_recuperacao" | "vendido"; verificacao: "pendente" | "em_analise" | "verificado" | "recusado"; crlv_evidencia_id: string | null; verificacao_motivo: string | null; verificado_em: string | null; verificado_por: string | null; criado_em: string };
        Insert: { id?: string; organizacao_id: string; placa: string; modelo: string; ano_fabricacao?: number | null; ano_modelo?: number | null; cor?: string | null; renavam?: string | null; odometro_atual: number; status?: "disponivel" | "alugado" | "em_manutencao" | "em_recuperacao" | "vendido"; verificacao?: "pendente" | "em_analise" | "verificado" | "recusado"; crlv_evidencia_id?: string | null; verificacao_motivo?: string | null; verificado_em?: string | null; verificado_por?: string | null; criado_em?: string };
        Update: { id?: string; organizacao_id?: string; placa?: string; modelo?: string; ano_fabricacao?: number | null; ano_modelo?: number | null; cor?: string | null; renavam?: string | null; odometro_atual?: number; status?: "disponivel" | "alugado" | "em_manutencao" | "em_recuperacao" | "vendido"; verificacao?: "pendente" | "em_analise" | "verificado" | "recusado"; crlv_evidencia_id?: string | null; verificacao_motivo?: string | null; verificado_em?: string | null; verificado_por?: string | null; criado_em?: string };
        Relationships: [];
      };
      versoes_modelo: {
        Row: { id: string; modelo_id: string; versao: number; corpo: string; parametros_padrao: Json; revisado_por_advogado_em: string | null; publicado_em: string | null; criado_em: string };
        Insert: { id?: string; modelo_id: string; versao: number; corpo: string; parametros_padrao: Json; revisado_por_advogado_em?: string | null; publicado_em?: string | null; criado_em?: string };
        Update: { id?: string; modelo_id?: string; versao?: number; corpo?: string; parametros_padrao?: Json; revisado_por_advogado_em?: string | null; publicado_em?: string | null; criado_em?: string };
        Relationships: [];
      };
      vistorias: {
        Row: { id: string; organizacao_id: string; contrato_id: string; tipo: "entrega" | "devolucao"; odometro: number; combustivel_oitavos: number; checklist: Json; pendencias: Json | null; aceite_locatario_evidencia_id: string | null; realizada_em: string; criado_em: string };
        Insert: { id?: string; organizacao_id: string; contrato_id: string; tipo: "entrega" | "devolucao"; odometro: number; combustivel_oitavos: number; checklist: Json; pendencias?: Json | null; aceite_locatario_evidencia_id?: string | null; realizada_em: string; criado_em?: string };
        Update: { id?: string; organizacao_id?: string; contrato_id?: string; tipo?: "entrega" | "devolucao"; odometro?: number; combustivel_oitavos?: number; checklist?: Json; pendencias?: Json | null; aceite_locatario_evidencia_id?: string | null; realizada_em?: string; criado_em?: string };
        Relationships: [];
      };
      webhook_eventos: {
        Row: { id: string; provedor: string; evento_id: string; tipo: string; corpo: Json; recebido_em: string; processado_em: string | null; erro: string | null };
        Insert: { id?: string; provedor: string; evento_id: string; tipo: string; corpo: Json; recebido_em?: string; processado_em?: string | null; erro?: string | null };
        Update: { id?: string; provedor?: string; evento_id?: string; tipo?: string; corpo?: Json; recebido_em?: string; processado_em?: string | null; erro?: string | null };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

export type Linha<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"];
