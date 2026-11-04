# Verificação de documentos e CNH

## O que o app já faz

- **CPF:** dígito verificador conferido no cadastro (CPF inventado não passa).
- **Regras da CNH** (pré-análise automática, `src/dominio/cadastro/elegibilidade.ts`):
  idade mínima, tempo mínimo de habilitação (pela data da 1ª habilitação), CNH
  vencida e observação **EAR** (Exerce Atividade Remunerada, exigida por Uber e 99).
  O resultado vira pendências para o locador; o app nunca aprova sozinho.
- **Fotos e PDFs:** CNH, comprovante de endereço, print do perfil no app de corrida
  e identidade (opcional). Guardados como evidência (não se apagam).
- **Carro:** o CRLV é conferido pela equipe em `/admin/verificacoes`.

## Conferir a CNH de graça (oficial)

1. O motorista abre o app **Carteira Digital de Trânsito** → a CNH → **Exportar** e
   envia o **PDF** no cadastro (o app já pede isso).
2. O locador abre o PDF e aponta o app **Vio** (do governo/Serpro, grátis) para o
   **QR Code** do documento.
3. O Vio mostra os dados da base oficial: nome, foto, categoria e validade. Se bater
   com a pessoa e com o cadastro, a CNH é verdadeira.

A CNH física do modelo novo também tem QR Code e serve do mesmo jeito.

## Automatizar (pago, quando houver volume)

| Serviço | O que faz | Como cobra |
|---|---|---|
| SERPRO Datavalid | Compara nome, CPF, CNH e a selfie com a base oficial | por consulta, contrato com o SERPRO |
| CAF, idwall, unico | Documento + selfie com prova de vida, prontos para app | por consulta (a partir de ~R$ 1) |

Para ligar um deles, o adaptador entra em `src/integracoes/` e é chamado no fim do
cadastro (`src/app/m/cadastro/[id]/acoes.ts`). O resultado vira mais uma pendência
para o locador decidir; a decisão continua sendo dele.
