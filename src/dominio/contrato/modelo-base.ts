/**
 * Minuta-base de locação semanal para motorista de aplicativo.
 * Escrita a partir das regras do documento de requisitos (seção 5), SEM as
 * cláusulas herdadas de contratos de empresa. Precisa de revisão jurídica
 * antes do uso real: enquanto a versão não for marcada como revisada, o PDF
 * sai com o aviso de minuta.
 */
export const NOME_MODELO_BASE = "Locação semanal para motorista de aplicativo";

export const MODELO_BASE = `
# CONTRATO DE LOCAÇÃO DE VEÍCULO
Pelo presente instrumento, de um lado {{locador_qualificacao}}, doravante LOCADOR, e de outro {{locatario_qualificacao}}, doravante LOCATÁRIO, ajustam a locação do veículo descrito abaixo, nas condições seguintes.

## Do objeto
- O LOCADOR dá em locação ao LOCATÁRIO o veículo {{veiculo_descricao}}, com {{veiculo_odometro}} no odômetro na data da entrega.
- O veículo destina-se ao uso pessoal do LOCATÁRIO e à atividade de motorista por aplicativo, sendo vedada a sublocação, o empréstimo ou a condução por terceiros.
- O estado do veículo na entrega é registrado em vistoria digital com fotos, que integra este contrato.

## Do prazo
- A locação vigora por {{prazo}}, de {{data_inicio}} a {{data_fim}}.
- A renovação depende de acordo entre as partes e será formalizada em novo contrato ou aditivo.

## Do aluguel e do pagamento
- O aluguel é de {{aluguel_semanal}} por semana, pago antecipadamente toda {{dia_vencimento}}.
- O primeiro pagamento vence em {{primeiro_vencimento}}.
- O pagamento é feito por Pix, pela cobrança emitida na plataforma em nome do LOCADOR.
- O atraso sujeita o débito a multa de {{multa_mora}}, juros de mora de {{juros_mora}} e correção monetária pelo {{indice_correcao}}.
- O aluguel será reajustado pelo {{indice_reajuste}} a cada {{reajuste_meses}}, ou na renovação.

## Da caução
- Como garantia, o LOCATÁRIO entrega caução de {{caucao_total}}, paga da seguinte forma: {{caucao_parcelas}}.
- A caução será devolvida em até {{prazo_devolucao_caucao}} após a devolução do veículo, descontados, com demonstrativo, os débitos apurados.
- A caução não é corrigida monetariamente e não pode ser usada pelo LOCATÁRIO para quitar aluguéis.

## Da quilometragem
- A franquia é de {{franquia_km}} por mês, não cumulativa.
- O que exceder a franquia será cobrado a {{valor_km_excedente}} por quilômetro, apurado ao fim de cada mês pelas leituras do odômetro.

## Das obrigações do locatário
- Além das demais obrigações deste contrato, o LOCATÁRIO se obriga a:
  - enviar pelo aplicativo, toda {{dia_checkin}}, as fotos do painel, da vareta de óleo e do líquido de arrefecimento e um vídeo ao redor do veículo;
  - manter cadastro ativo em aplicativo de transporte e CNH válida durante toda a locação;
  - circular apenas em {{area_circulacao}}, salvo autorização prévia por escrito do LOCADOR;
  - levar o veículo às revisões programadas, a cada {{revisao_km}}, quando avisado pela plataforma;
  - comunicar ao LOCADOR, em até 24 (vinte e quatro) horas, qualquer acidente, roubo, furto ou defeito, enviando o boletim de ocorrência quando houver;
  - pagar as multas de trânsito do período da locação, acrescidas de taxa de administração de {{taxa_administracao_multa}}, e indicar-se como condutor no prazo legal;
  - devolver o veículo limpo, com o mesmo nível de combustível da entrega e com todos os itens registrados na vistoria.

## Da manutenção
- As revisões preventivas e o desgaste natural do veículo são de responsabilidade do LOCADOR.
- Os danos causados por mau uso, imperícia ou negligência são de responsabilidade do LOCATÁRIO, mediante demonstrativo com justificativa e prova.
- Se o veículo ficar parado por mais de 24 (vinte e quatro) horas para manutenção não causada pelo LOCATÁRIO, o aluguel do período parado não será cobrado.

## Da inadimplência
- Atraso superior a {{dias_inadimplencia}} gera notificação formal ao LOCATÁRIO, com prazo de {{horas_regularizar}} para quitar o débito ou apresentar o comprovante.
- O descumprimento do envio das fotos semanais segue a mesma regra de notificação e prazo.
- Antes de qualquer protesto ou registro em cadastro de inadimplentes, o LOCATÁRIO será notificado com {{horas_aviso_protesto}} de antecedência.
- Persistindo a inadimplência, o LOCADOR poderá rescindir este contrato e exigir a devolução imediata do veículo.

## Da rescisão
- Qualquer das partes pode rescindir este contrato mediante aviso prévio de 7 (sete) dias.
- A rescisão antecipada pelo LOCATÁRIO, ou por culpa dele, sujeita-o a multa compensatória equivalente ao menor valor entre 50% (cinquenta por cento) dos aluguéis vincendos e o valor proporcional ao período não cumprido, podendo ser abatida da caução.

## Da devolução do veículo
- Na devolução é feita nova vistoria digital, comparada à de entrega, que gera o demonstrativo de pendências.
- As pendências apuradas são descontadas da caução e o saldo, se houver, é cobrado do LOCATÁRIO.

## Das comunicações e da assinatura
- As cobranças, avisos e notificações são enviados pelo LOCADOR por meio da plataforma Aluguei, pelo aplicativo, WhatsApp ou e-mail informados no cadastro, e valem como notificação formal.
- A plataforma atua apenas como ferramenta do LOCADOR e não é parte deste contrato.
- As partes assinam este contrato eletronicamente, nos termos da Lei nº 14.063/2020, com registro de data, hora, IP, dispositivo e código de verificação (hash) do documento.

## Da proteção de dados
- Os dados pessoais do LOCATÁRIO são tratados para a execução deste contrato e para o exercício regular de direitos, conforme a Lei nº 13.709/2018 (LGPD) e as autorizações registradas no cadastro.
- Os registros da locação são guardados por até 5 (cinco) anos após o seu término.

## Do foro
- Fica eleito o foro da comarca de {{foro}} para dirimir as questões deste contrato.

{{cidade_assinatura}}, {{data_emissao}}.
`;
