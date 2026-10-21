import { redirect } from "next/navigation";

/** Antiga escolha de perfil: agora toda conta entra no app e ativa o modo locador quando quiser. */
export default function BemVindo() {
  redirect("/m");
}
