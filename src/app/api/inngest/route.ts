import { serve } from "inngest/next";
import { inngest } from "@/jobs/cliente";
import { funcoes } from "@/jobs/cobranca-diaria";

export const { GET, POST, PUT } = serve({ client: inngest, functions: funcoes });
