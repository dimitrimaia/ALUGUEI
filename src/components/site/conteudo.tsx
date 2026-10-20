import { BellRing, Camera, Car, ClipboardCheck, Eye, FileSignature, FileText, Gauge, Landmark, Lock, MessageCircle, QrCode, Receipt, ShieldCheck, Smartphone, UserCheck, Wallet } from "lucide-react";
import { MockupLocador, MockupMotorista } from "./mockups";
import type { ConteudoPerfil } from "./pagina-perfil";

export const LOCADOR: ConteudoPerfil = {
  tema: "azul",
  selo: "Para quem aluga carro para motorista de app",
  titulo: "Alugue seu carro para motorista de app sem virar cobrador.",
  texto: "O Aluguei cuida da rotina do contrato: cadastro e análise do motorista, contrato digital, vistoria com fotos e cobrança semanal no Pix. Você acompanha pelo painel e decide o que importa.",
  ctas: [{ rotulo: "Criar conta de locador", href: "/entrar?perfil=locador" }, { rotulo: "Ver como funciona", href: "#como-funciona" }],
  marcas: ["Sem planilha", "Pix direto na sua conta", "Carro parado não paga"],
  mockup: <MockupLocador />,
  destaques: [
    { icone: Smartphone, titulo: "Cadastro em 5 minutos", texto: "o motorista se cadastra pelo celular, a partir do seu convite" },
    { icone: FileSignature, titulo: "Zero papel", texto: "convite, contrato, vistoria e pagamento acontecem no app" },
    { icone: Car, titulo: "Carro parado não paga", texto: "você só paga pelos carros que estão rodando" },
    { icone: Landmark, titulo: "Pix na sua conta", texto: "o aluguel cai direto para você, com baixa automática" },
  ],
  passos: {
    titulo: "Do convite ao carro rodando, sem papel",
    itens: [
      { icone: MessageCircle, titulo: "Convide pelo WhatsApp", texto: "Cadastre o carro, defina valor, caução e franquia e mande o link. O motorista vê tudo antes de se cadastrar." },
      { icone: UserCheck, titulo: "Analise o cadastro", texto: "O motorista manda CNH, comprovantes e o print do app. O sistema aponta pendências e você decide." },
      { icone: FileSignature, titulo: "Assine e vistorie", texto: "O contrato sai pronto com os valores combinados. Na retirada, a vistoria com fotos fica registrada." },
      { icone: Wallet, titulo: "Receba toda semana", texto: "O Pix é gerado antes do vencimento e a baixa é automática. Atrasos aparecem no painel." },
    ],
  },
  beneficios: {
    titulo: "Menos tempo cobrando, mais controle da frota",
    texto: "Tudo o que você fazia no WhatsApp e na planilha passa a acontecer sozinho, com registro.",
    itens: [
      "Sem cobrar aluguel nem pedir comprovante toda semana",
      "Multa e juros do contrato calculados no próprio Pix",
      "Contrato, vistoria e pagamentos de cada carro num lugar só",
      "Provas organizadas para discutir uma avaria ou um débito",
    ],
  },
  recursos: {
    titulo: "O que o contrato manda, o Aluguei acompanha",
    itens: [
      { icone: UserCheck, titulo: "Análise do motorista", texto: "Pré-análise de idade, tempo de CNH e observação EAR. Quem aprova é você." },
      { icone: FileSignature, titulo: "Contrato digital", texto: "Com os seus valores, numerado e com valor por extenso sem erro. Assinado pelo celular." },
      { icone: ClipboardCheck, titulo: "Vistoria de entrega", texto: "8 fotos guiadas com data, hora e local, checklist de avarias e confirmação do motorista." },
      { icone: Wallet, titulo: "Cobrança no Pix", texto: "Pix antes do vencimento, encargos do contrato no atraso e baixa automática." },
      { icone: Receipt, titulo: "Financeiro", texto: "Recebido, a receber e em atraso, com exportação para planilha." },
      { icone: Camera, titulo: "Check-in de segunda", texto: "Fotos do painel, óleo, água e vídeo do carro toda semana.", breve: true },
      { icone: BellRing, titulo: "Lembretes", texto: "Avisos antes do vencimento e notificação formal no prazo do contrato.", breve: true },
      { icone: Gauge, titulo: "Km e revisões", texto: "Km do mês contra a franquia e alerta da próxima revisão.", breve: true },
    ],
  },
  seguranca: {
    titulo: "Seu dinheiro na sua conta. Suas provas guardadas.",
    texto: "Cada foto, vistoria e aceite fica registrado e não pode ser alterado depois.",
    itens: [
      { icone: Landmark, titulo: "Pix direto para você", texto: "Conta de recebimento no seu nome, no Asaas. A plataforma não guarda o seu dinheiro." },
      { icone: ShieldCheck, titulo: "Provas com código", texto: "Fotos e documentos com data, hora, local e código de verificação." },
      { icone: Lock, titulo: "Dados protegidos", texto: "Cada locador só vê os próprios dados, com autorizações registradas (LGPD)." },
      { icone: UserCheck, titulo: "Você decide", texto: "Rescisão, retomada do carro e protesto nunca acontecem sozinhos." },
    ],
  },
  preco: {
    titulo: "Você só paga pelo carro que está rodando",
    texto: "Sem fatura separada: a taxa sai de cada Pix de aluguel que o motorista paga. Carro parado não paga nada.",
    rotulo: "Por carro com contrato ativo",
    valor: "R$ 250",
    sufixo: "/mês",
    detalhe: "Equivale a R$ 57,53 por semana de aluguel.",
    itens: ["Carro parado não paga", "Cobrada junto com o aluguel", "Contrato, vistoria, Pix e extrato incluídos", "Pessoa física ou empresa"],
    cta: { rotulo: "Criar conta de locador", href: "/entrar?perfil=locador" },
  },
  duvidas: [
    { p: "O dinheiro do aluguel passa pelo Aluguei?", r: "Não. O Pix cai numa conta de recebimento no seu nome, no Asaas, instituição de pagamento autorizada pelo Banco Central. O Aluguei recebe só a própria taxa, separada no pagamento." },
    { p: "O contrato tem validade jurídica?", r: "Sim. A assinatura é eletrônica (Lei 14.063/2020) e cada aceite guarda data, hora, IP, aparelho e o código de verificação do PDF. Recomendamos revisar o modelo com o seu advogado." },
    { p: "Preciso ter CNPJ?", r: "Não. Dá para usar como pessoa física (CPF) ou empresa (CNPJ, inclusive MEI)." },
    { p: "E se o motorista atrasar?", r: "O Pix já aplica a multa e os juros do contrato. Você vê o atraso no painel e decide o que fazer." },
    { p: "Quanto custa?", r: "R$ 250 por mês para cada carro com contrato ativo, descontados aos poucos de cada Pix de aluguel. Carro parado não paga." },
    { p: "Posso registrar um pagamento em dinheiro?", r: "Sim. No financeiro, use “Recebi por fora”: a cobrança é baixada e fica registrada quem fez." },
    { p: "Como ficam os dados dos motoristas?", r: "Documentos e fotos ficam com acesso restrito ao locador que convidou. O motorista autoriza cada uso no cadastro." },
  ],
  final: {
    titulo: "Comece pelo primeiro carro",
    texto: "Crie a conta, cadastre o carro e mande o convite para o motorista. Leva poucos minutos.",
    ctas: [{ rotulo: "Criar conta de locador", href: "/entrar?perfil=locador" }, { rotulo: "Já tenho conta", href: "/entrar?perfil=locador" }],
  },
};

export const MOTORISTA: ConteudoPerfil = {
  tema: "claro",
  selo: "Para motoristas de Uber e 99",
  titulo: <>Seu carro alugado, <span className="text-marca">sem papelada e sem surpresa.</span></>,
  texto: "Cadastro pelo celular, contrato explicado em linguagem simples, pagamento no Pix e um extrato com tudo o que foi cobrado.",
  ctas: [{ rotulo: "Entrar", href: "/entrar?perfil=motorista" }, { rotulo: "Ver como funciona", href: "#como-funciona" }],
  marcas: ["Sem app para baixar", "Pix com confirmação na hora", "Grátis para o motorista"],
  mockup: <MockupMotorista />,
  destaques: [
    { icone: Smartphone, titulo: "Tudo no celular", texto: "cadastro, contrato e pagamento pelo navegador, sem baixar nada" },
    { icone: FileText, titulo: "Contrato sem juridiquês", texto: "um resumo simples antes de assinar, com o contrato completo a um toque" },
    { icone: QrCode, titulo: "Pix em segundos", texto: "QR Code ou copia e cola, com confirmação automática" },
    { icone: Receipt, titulo: "Extrato completo", texto: "cada aluguel, pagamento e encargo com data e motivo" },
  ],
  passos: {
    titulo: "Do convite ao carro na sua mão",
    itens: [
      { icone: MessageCircle, titulo: "Receba o convite", texto: "O locador manda um link no WhatsApp com o carro, o valor da semana, a caução e a franquia de km." },
      { icone: UserCheck, titulo: "Faça o cadastro", texto: "CNH, comprovante de endereço e o print do seu perfil no Uber ou 99. Leva uns 5 minutos." },
      { icone: FileSignature, titulo: "Assine pelo celular", texto: "Antes de assinar, você vê um resumo do contrato em linguagem simples." },
      { icone: ClipboardCheck, titulo: "Retire o carro", texto: "Vocês fazem a vistoria juntos e você confirma as fotos no seu celular." },
    ],
  },
  beneficios: {
    titulo: "Menos dor de cabeça, mais tempo rodando",
    texto: "Você sabe exatamente quanto paga, quando vence e o que foi registrado do carro.",
    itens: [
      "Sem mandar comprovante de pagamento no WhatsApp",
      "Vencimentos e valores sempre à vista no app",
      "Vistoria com fotos que mostra o estado do carro na retirada",
      "Contrato e extrato disponíveis a qualquer hora",
    ],
  },
  recursos: {
    titulo: "O que você encontra no app",
    itens: [
      { icone: UserCheck, titulo: "Cadastro pelo celular", texto: "Dados, CNH e fotos dos documentos, com CEP que completa o endereço." },
      { icone: FileSignature, titulo: "Assinatura digital", texto: "Resumo em linguagem simples e assinatura com validade legal." },
      { icone: ClipboardCheck, titulo: "Vistoria no celular", texto: "Você confere as fotos e o checklist antes de confirmar a retirada." },
      { icone: QrCode, titulo: "Pagamento no Pix", texto: "QR Code ou copia e cola, com o botão “Já paguei”." },
      { icone: Receipt, titulo: "Extrato", texto: "Tudo o que foi cobrado e pago, com a origem de cada item." },
      { icone: Camera, titulo: "Check-in guiado", texto: "Fotos de segunda em menos de um minuto, guiadas pela câmera.", breve: true },
      { icone: BellRing, titulo: "Lembretes", texto: "Aviso antes de cada vencimento para não atrasar.", breve: true },
      { icone: Gauge, titulo: "Km do mês", texto: "Quanto você já rodou contra a franquia do contrato.", breve: true },
    ],
  },
  seguranca: {
    titulo: "Seus documentos protegidos. O combinado registrado.",
    texto: "Você só paga o que está no contrato, e tudo o que acontece com o carro fica documentado.",
    itens: [
      { icone: Lock, titulo: "Documentos protegidos", texto: "Só o locador que te convidou vê seus documentos, com a sua autorização." },
      { icone: ShieldCheck, titulo: "Vistoria que te protege", texto: "O que já existia no carro fica registrado com data, hora e local." },
      { icone: Eye, titulo: "Cobrança transparente", texto: "Multa e juros só nos valores do contrato, separados no extrato." },
      { icone: Landmark, titulo: "Pix seguro", texto: "Pagamento por instituição autorizada pelo Banco Central." },
    ],
  },
  preco: {
    titulo: "Para você, o Aluguei é grátis",
    texto: "Você paga só o aluguel combinado com o locador. O app não cobra nada do motorista.",
    rotulo: "Para o motorista",
    valor: "R$ 0",
    detalhe: "Sem mensalidade, sem taxa de cadastro.",
    itens: ["Sem app para baixar", "Sem taxa no pagamento do aluguel", "Contrato e extrato sempre disponíveis", "Funciona em Android e iPhone"],
    cta: { rotulo: "Entrar como motorista", href: "/entrar?perfil=motorista" },
  },
  duvidas: [
    { p: "Preciso baixar algum aplicativo?", r: "Não. Tudo funciona no navegador do celular. Se quiser, adicione o Aluguei à tela inicial para abrir como um app." },
    { p: "Como faço para me cadastrar?", r: "O cadastro começa pelo link de convite que o locador manda. Se ainda não recebeu, peça a ele." },
    { p: "Quais documentos preciso?", r: "CNH com a observação EAR, comprovante de endereço e um print do seu perfil no Uber ou 99." },
    { p: "Como pago o aluguel?", r: "Pelo Pix, com QR Code ou código copia e cola. A confirmação chega em segundos e fica no seu extrato." },
    { p: "E se eu atrasar?", r: "O Pix aplica a multa e os juros previstos no contrato, e eles aparecem separados no extrato." },
    { p: "E se o carro tiver um risco que não fui eu?", r: "Na retirada, a vistoria registra fotos com data, hora e local. Você confere e só confirma se estiver tudo certo." },
    { p: "Meus documentos ficam seguros?", r: "Só o locador que te convidou vê seus documentos, e você autoriza cada uso no cadastro." },
  ],
  final: {
    titulo: "Recebeu um convite?",
    texto: "Abra o link no seu celular e faça o cadastro. Se já tem conta, é só entrar.",
    ctas: [{ rotulo: "Entrar como motorista", href: "/entrar?perfil=motorista" }, { rotulo: "Ver dúvidas", href: "#duvidas" }],
  },
};
