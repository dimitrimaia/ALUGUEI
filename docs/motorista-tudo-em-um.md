# Motorista: tudo em um

Ferramentas de trabalho do motorista, grátis para qualquer conta, aluga pelo
Aluguei ou não. A ideia: o motorista abre o Aluguei todo dia, não só para pagar.

Aba **Plantão** no rodapé do motorista (`/m/plantao`). Regras puras em
`src/dominio/ganhos/` (com testes), tabelas na migração `0008`.

## Plantão (`/m/plantao`)
- **Iniciar plantão** (km do painel e meta do dia, opcionais) → horas rodando,
  ganho do dia, lucro estimado, R$/hora e quanto falta para a meta, no ritmo atual.
- **Lançar ganho** por plataforma (Uber, 99, inDrive, iFood, particular, outra),
  corrida a corrida ou o total do dia.
- **Lançar despesa** (combustível com litros e km, manutenção, lavagem, comida…).
- **Encerrar** com o km final → relatório do dia.

## Custos do carro (`/m/plantao/custos`)
- Combustível (gasolina, etanol, GNV, diesel, elétrico), preço e média.
- Fixos do mês (seguro, celular…) → custo por hora. **O aluguel do contrato ativo
  entra sozinho** e acompanha o contrato (52 semanas ÷ 12 meses).
- Desgaste por km (óleo, pneus, revisão; apague se o locador paga a manutenção).
- Régua do semáforo: mínimo por km, mínimo por hora, distância máxima até o
  passageiro. E a meta diária.

## Lucro (como é calculado)
`lucro = ganhos − despesas lançadas − fixos do período (proporcionais aos dias) −
combustível estimado pelo km (só se nenhum abastecimento foi lançado)`.

## Calculadora (`/m/plantao/calculadora`)
- **Corrida:** valor, km, minutos e distância até o passageiro → semáforo verde,
  amarelo ou vermelho, R$/km, R$/hora, custo e lucro. "Colar oferta copiada" lê o
  texto (mesma regra do leitor do Android). Aceitei/Recusei vai para o histórico.
- **Viagem:** ida e volta, pedágio, comida, hospedagem e margem → custo total,
  custo por km, ponto de equilíbrio e preço sugerido.
- **Etanol × gasolina:** pelo custo por km com o consumo de verdade (não só os 70%).

### Semáforo
- Verde: passa dos dois mínimos, passageiro perto e dá lucro.
- Amarelo: abaixo de um mínimo, mas até 15% abaixo, ou passageiro um pouco longe.
- Vermelho: prejuízo, mais de 15% abaixo de um mínimo, ou passageiro a mais de
  1,5× a distância máxima.
- Sem o tempo da corrida, estima a 24 km/h e avisa "(estimado)".

## Semáforo por cima da Uber e da 99 (`/m/plantao/semaforo`)
Só no app Android (ver `app-nativo.md`). A tela:
1. Mostra o **aviso em destaque** (o que lê, o que guarda, riscos com os termos da
   Uber e da 99, que nunca aceita corridas sozinho) e pede o "Li e entendi".
2. Leva passo a passo pelas permissões, com tutorial de cada uma: sobreposição,
   notificações, acessibilidade (opcional: sem ela, digitação rápida na bolha) e
   bateria (opcional). **Ao conceder, o app volta sozinho e a tela segue.**
3. Liga/desliga a bolha e tem "Testar oferta".
- As corridas avaliadas ficam numa fila no celular e sobem ao abrir o Plantão
  (`corridas_avaliadas`, sem duplicar). Só números: nunca a tela.
- No navegador e no iPhone: explica e manda para a calculadora.

## Relatórios (`/m/plantao/relatorios`)
Hoje, 7 e 30 dias: lucro, R$/hora, R$/km, ganhos por dia, por plataforma,
despesas por tipo, estatística do semáforo e **planilha (CSV)** para o imposto.

## Caronas (`/m/caronas`, público em `/caronas`)
Carona **com divisão de custos**, sem lucro (é o que separa de transporte pago):
- A contribuição por pessoa tem teto: (combustível + desgaste) × km + pedágio,
  dividido por todos no carro, motorista incluído (`dominio/ganhos/carona.ts`).
  Acima do teto, o app não publica.
- Oferecer: cidades, ponto de encontro, dia e hora, vagas, km ("Calcular" pela
  rota), pedágio, combinados (bagagem, pets, só mulheres…).
- Pedir: precisa de celular confirmado. O motorista aceita ou recusa; depois de
  aceito, cada um vê o WhatsApp do outro. Avisos no app/push/e-mail.

## Meus clientes (`/m/clientes`, público em `/c/<link>`)
Página do motorista para clientes particulares (ideia do projeto DriverElite):
tabela de preço por categoria (base + km + minuto, com mínimo), o cliente digita
origem e destino, vê o preço e agenda pelo WhatsApp do motorista com a mensagem
pronta. Os pedidos aparecem em `/m/clientes` (confirmar, concluir, cancelar).
Limite: 5 pedidos por hora do mesmo WhatsApp.

## Rotas
Endereço → coordenadas pelo Photon e rota pelo OSRM (`integracoes/rotas.ts`),
gratuitos e com limite de uso justo. Se falharem: linha reta × 1,35 a 25 km/h.
Para volume alto, trocar por Google Routes ou Mapbox só nesse arquivo.

## Para ligar
Rodar `supabase/migracoes/0008_groovy_scarlet_spider.sql` no SQL Editor.

## Próximos passos
- Ranking de horários e regiões (com a localização, se o motorista permitir).
- Lembrete de troca de óleo pelo km lançado.
- Preço de combustível por posto (colaborativo).
- Avaliação entre motorista e passageiro nas caronas.
