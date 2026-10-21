# Check-in semanal

Requisitos RF-070 a RF-073. No dia combinado no contrato (`parametros.checkin.diaSemana`),
o motorista manda pelo app:

1. foto do **painel ligado**, com km e combustível legíveis;
2. foto da **vareta do óleo**;
3. foto do **líquido de arrefecimento**;
4. um **vídeo** dando a volta no carro;
5. o **km** do painel e o nível de **combustível**.

## Regras (`src/dominio/checkin/checkin.ts`, com testes)

- Abre na **véspera** do dia combinado. Depois do dia, fica **atrasado**, mas ainda
  pode ser enviado.
- O km não pode ser menor que o último registrado. Um salto de mais de 5.000 km pede
  confirmação (quase sempre é erro de digitação).
- As fotos saem direto da câmera, reduzidas no celular, com carimbo de data, hora e
  local. Vão para o cofre de provas com hash, hora do servidor, IP e aparelho. O vídeo
  vai sem compressão, com até 50 MB (uns 30 segundos).
- Um check-in por semana (`checkins.obrigacao_id` é único). Ao concluir, a obrigação
  é cumprida, o km entra no histórico do carro e o odômetro é atualizado.

## Locador

- Recebe "Check-in enviado: Revisar" em "Precisa de você" e abre as fotos, o vídeo,
  o km, o combustível e o local no mapa. Toca em "Marcar como revisado".
- Check-in não enviado aparece como "Atrasado".
- Na rotina diária, check-in sem envio há mais dias do que o contrato tolera
  (`prazos.diasSemCheckinParaNotificar`) vira uma **decisão pendente** no contrato.
  As opções são "Registrar infração" (só anota no histórico) ou "Dispensar". O app
  não notifica, não multa e não rescinde sozinho.

## Motorista

- No início, quando o check-in abre, aparece o cartão "Hora do check-in da semana".
- O atalho "Check-in" do início e do menu (`/m/checkin`) abre o check-in pendente
  mais antigo.

## Próximos passos

- Lembrete no dia do check-in por WhatsApp e notificação no celular (com a régua de
  notificações).
- Comparar o km com a franquia mensal e avisar o excedente.
- Itens configuráveis por locador (pneus, limpeza), sem mudar o formato salvo.
