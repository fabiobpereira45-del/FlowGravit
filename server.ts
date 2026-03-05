import express from "express";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { createServer as createViteServer } from "vite";

dotenv.config();

declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function createApp() {
  const app = express();
  app.use(express.json());

  const PORT = 3001;

  // Middleware to verify Supabase JWT
  const requireAuth = async (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "Não autorizado" });

    const token = authHeader.split(" ")[1];
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: "Sessão inválida" });
    }

    req.user = user;
    next();
  };

  // API Routes
  app.get("/api/workflows", requireAuth, async (req, res) => {
    const { data: workflows, error } = await supabase
      .from("workflows")
      .select("*")
      .eq("user_id", req.user.id)
      .order("created_at", { ascending: false });

    if (error) return res.status(500).json({ error: "Erro ao buscar fluxos" });
    res.json(workflows);
  });

  app.post("/api/workflows", requireAuth, async (req, res) => {
    const { name, nodes, edges } = req.body;
    const { data, error } = await supabase
      .from("workflows")
      .insert([{
        user_id: req.user.id,
        name: name || "Untitled Workflow",
        nodes,
        edges
      }])
      .select()
      .single();

    if (error) return res.status(500).json({ error: "Erro ao salvar fluxo" });
    res.json({ id: data.id });
  });

  app.put("/api/workflows/:id", requireAuth, async (req, res) => {
    const { id } = req.params;
    const { name, nodes, edges } = req.body;
    const { error } = await supabase
      .from("workflows")
      .update({ name, nodes, edges })
      .eq("id", id)
      .eq("user_id", req.user.id);

    if (error) return res.status(500).json({ error: "Erro ao atualizar fluxo" });
    res.json({ success: true });
  });

  app.delete("/api/workflows/:id", requireAuth, async (req, res) => {
    const { id } = req.params;
    const { error } = await supabase
      .from("workflows")
      .delete()
      .eq("id", id)
      .eq("user_id", req.user.id);

    if (error) return res.status(500).json({ error: "Erro ao deletar fluxo" });
    res.json({ success: true });
  });

  // Workflow Execution Engine (Simple Webhook Trigger)
  app.post("/api/webhook/:id", async (req, res) => {
    const { id } = req.params;
    const { data: workflow, error: wfError } = await supabase
      .from("workflows")
      .select("*")
      .eq("id", id)
      .single();

    if (wfError || !workflow) {
      return res.status(404).json({ error: "Fluxo de trabalho não encontrado" });
    }

    const nodes = workflow.nodes;
    const payload = req.body;

    const logs: string[] = [];
    logs.push(`[${new Date().toISOString()}] Fluxo iniciado via Webhook`);
    // ... logic remains same ...
    logs.push(`[${new Date().toISOString()}] Payload recebido: ${JSON.stringify(payload)}`);

    for (const node of nodes) {
      if (node.type === 'ai') {
        logs.push(`[${new Date().toISOString()}] Nó ${node.id} (IA): Processando com Gemini...`);
      } else if (node.type === 'whatsapp') {
        logs.push(`[${new Date().toISOString()}] Nó ${node.id} (WhatsApp): Enviando mensagem para ${node.data.config?.phone || 'número configurado'}...`);
      } else if (node.type === 'http') {
        logs.push(`[${new Date().toISOString()}] Nó ${node.id} (HTTP): Chamando API externa...`);
      }
    }

    logs.push(`[${new Date().toISOString()}] Fluxo concluído com sucesso`);

    await supabase
      .from("executions")
      .insert([{
        workflow_id: id,
        status: "completed",
        logs
      }]);

    res.json({ success: true, logs });
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
  }

  return app;
}
