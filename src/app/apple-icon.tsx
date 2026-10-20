import { respostaIcone } from "@/lib/icone";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function IconeApple() {
  return respostaIcone(180, { mascaravel: true });
}
