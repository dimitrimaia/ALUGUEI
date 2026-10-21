# Devolução do carro e encerramento do contrato

RF-035 (rescisão), RF-045 (demonstrativo de pendências) e RF-060 (devolução da caução).
Na ficha do contrato: **Devolução e encerramento**.

## Passo a passo (locador)

1. **Vistoria de devolução**: a mesma vistoria guiada da entrega (fotos, km,
   combustível e checklist), feita com o carro na frente. O motorista recebe para
   conferir e confirmar no app dele.
2. **Demonstrativo**, calculado na tela e conferido de novo no servidor
   (`src/dominio/encerramento/demonstrativo.ts`, com testes):
   - **km excedente**: km rodados menos a franquia proporcional aos dias (franquia
     mensal × dias ÷ 30), vezes o valor do km do contrato;
   - **avarias**: os itens que estavam OK na entrega e voltaram com avaria ou
     faltando já aparecem, com a descrição da vistoria; o locador informa o valor;
   - **combustível**, se voltou com menos que saiu (valor informado pelo locador);
   - **multa rescisória**, quando o motivo é saída antes do prazo ou rescisão. A
     fórmula ainda está com o advogado; por enquanto o locador informa o valor;
   - o que estiver **em aberto no extrato**, inclusive aluguéis vencidos até a
     devolução que ainda não tinham sido cobrados.
3. A **caução paga quita as pendências**; o que sobra volta para o motorista em até
   `prazos.diasUteisDevolucaoCaucao` dias úteis (feriados nacionais e bancários fora
   da conta). Se a dívida for maior que a caução, fica um saldo devedor.
4. **Confirmar o encerramento** (só o dono da conta, com confirmação na tela). O app:
   - lança as pendências e o uso da caução no extrato (só inserções, com chave de
     idempotência);
   - estorna a caução lançada e não paga;
   - cancela os vencimentos depois da devolução;
   - marca o contrato como **encerrado** (ou **rescindido**) e o carro como
     **disponível**, com o km da devolução;
   - avisa o motorista com o valor e a data da caução.
5. **Caução devolvida**: depois do Pix para o motorista, o locador toca em "Já
   devolvi a caução". O motorista recebe o aviso e a data fica no contrato.

Nada disso acontece sozinho: o app calcula e propõe, e quem encerra é o locador.

## Ainda falta

- Cancelar no Asaas as cobranças já emitidas de vencimentos cancelados.
- Cobrar o saldo devedor pelo Pix (hoje fica no extrato).
- Aluguel proporcional quando a devolução cai no meio da semana (regra a definir no
  contrato).
