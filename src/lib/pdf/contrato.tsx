import "server-only";
import { Document, Font, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { type DocumentoContrato, tituloClausula } from "@/dominio/contrato/modelo";

// A hifenização automática é em inglês e quebra palavras em português no lugar errado.
Font.registerHyphenationCallback((palavra) => [palavra]);

const s = StyleSheet.create({
  pagina: { paddingTop: 48, paddingBottom: 56, paddingHorizontal: 56, fontSize: 10, fontFamily: "Helvetica", lineHeight: 1.45 },
  titulo: { fontSize: 13, fontFamily: "Helvetica-Bold", textAlign: "center", marginBottom: 14 },
  minuta: { fontSize: 8, color: "#b45309", textAlign: "center", marginBottom: 10 },
  paragrafo: { marginBottom: 6, textAlign: "justify" },
  clausula: { fontFamily: "Helvetica-Bold", marginTop: 10, marginBottom: 4 },
  item: { flexDirection: "row", marginBottom: 4 },
  numero: { width: 28 },
  textoItem: { flex: 1, textAlign: "justify" },
  alinea: { flexDirection: "row", marginLeft: 28, marginBottom: 2 },
  letra: { width: 18 },
  assinaturas: { marginTop: 28, flexDirection: "row", gap: 24 },
  assinatura: { flex: 1, borderTopWidth: 0.5, paddingTop: 4, fontSize: 9, textAlign: "center" },
  rodape: { position: "absolute", bottom: 24, left: 56, right: 56, fontSize: 7.5, color: "#6b6b66", textAlign: "center" },
});

export async function gerarPdfContrato(doc: DocumentoContrato, opcoes: { minuta: boolean; locador: string; locatario: string }): Promise<Buffer> {
  return renderToBuffer(
    <Document title={doc.titulo} author="Aluguei" language="pt-BR">
      <Page size="A4" style={s.pagina}>
        {opcoes.minuta && <Text style={s.minuta}>MINUTA-BASE AINDA NÃO REVISADA POR ADVOGADO</Text>}
        <Text style={s.titulo}>{doc.titulo}</Text>
        {doc.preambulo.map((p, i) => <Text key={`p${i}`} style={s.paragrafo}>{p}</Text>)}
        {doc.clausulas.map((c) => (
          <View key={c.numero}>
            <Text style={s.clausula} minPresenceAhead={40}>{tituloClausula(c)}</Text>
            {c.paragrafos.map((p, i) => <Text key={`c${c.numero}p${i}`} style={s.paragrafo}>{p}</Text>)}
            {c.itens.map((item) => (
              <View key={item.numero}>
                <View style={s.item}>
                  <Text style={s.numero}>{item.numero}.</Text>
                  <Text style={s.textoItem}>{item.texto}</Text>
                </View>
                {item.alineas.map((a) => (
                  <View key={a.letra} style={s.alinea}>
                    <Text style={s.letra}>{a.letra})</Text>
                    <Text style={s.textoItem}>{a.texto}</Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        ))}
        <View style={s.assinaturas} wrap={false}>
          <Text style={s.assinatura}>{opcoes.locador}{"\n"}LOCADOR</Text>
          <Text style={s.assinatura}>{opcoes.locatario}{"\n"}LOCATÁRIO</Text>
        </View>
        <Text style={s.rodape} fixed render={({ pageNumber, totalPages }) =>
          `Assinado eletronicamente pela plataforma Aluguei (Lei 14.063/2020) · página ${pageNumber} de ${totalPages}`} />
      </Page>
    </Document>,
  );
}
