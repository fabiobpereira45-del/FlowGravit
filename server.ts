import express from "express";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

// Define Vite server type for dynamic import
type ViteDevServer = any;

declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

const getSupabase = () => {
  const supabaseUrl = process.env.SUPABASE_URL || "";
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || "";
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("ERRO: SUPABASE_URL ou SUPABASE_ANON_KEY não configuradas!");
  }
  return createClient(supabaseUrl, supabaseAnonKey);
};

export async function createApp() {
  const app = express();
  app.use(express.json());

  const PORT = 3001;

  const supabase = getSupabase();

  // Middleware to verify Supabase JWT
  const requireAuth = async (req: any, res: any, next: any) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(401).json({ error: "Não autorizado" });

      const token = authHeader.split(" ")[1];
      if (!token) return res.status(401).json({ error: "Token ausente" });

      const { data: { user }, error } = await supabase.auth.getUser(token);

      if (error || !user) {
        console.error('Auth error:', error);
        return res.status(401).json({ error: "Sessão inválida" });
      }

      req.user = user;
      next();
    } catch (err) {
      console.error('Crash in requireAuth:', err);
      res.status(401).json({ error: "Erro de autenticação" });
    }
  };

  // Basic Health Check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", env: process.env.NODE_ENV });
  });

  // Debug Env Presence (Masked)
  app.get("/api/debug-env", (req, res) => {
    res.json({
      url: !!process.env.SUPABASE_URL,
      key: !!process.env.SUPABASE_ANON_KEY,
      nodeEnv: process.env.NODE_ENV
    });
  });

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
    try {
      const { name, nodes, edges } = req.body;
      console.log('Creating workflow for user:', req.user.id);

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

      if (error) {
        console.error('Supabase error inserting workflow:', error);
        return res.status(500).json({ error: error.message || "Erro ao salvar fluxo no banco" });
      }

      console.log('Workflow created successfully ID:', data.id);
      res.json({ id: data.id });
    } catch (err: any) {
      console.error('Crash in POST /api/workflows:', err);
      res.status(500).json({ error: "Internal Server Error during workflow creation" });
    }
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
    logs.push(`[${new Date().toISOString()}] Payload recebido: ${JSON.stringify(payload)}`);

    // Helper to replace variables like {{name}} with payload values
    const resolveVars = (text: string, vars: any) => {
      if (!text) return "";
      return text.replace(/\{\{(.*?)\}\}/g, (_, key) => vars[key.trim()] || `{{${key}}}`);
    };

    for (const node of nodes) {
      if (node.type === 'ai') {
        logs.push(`[${new Date().toISOString()}] Nó ${node.id} (IA): Processando com Gemini...`);
        // AI logic would go here
      } else if (node.type === 'whatsapp') {
        const config = node.data.config || {};
        const phone = resolveVars(config.phone || payload.phone, payload);
        const message = resolveVars(config.message || "Olá!", payload);
        const instance = config.instance || "main";

        logs.push(`[${new Date().toISOString()}] Nó ${node.id} (WhatsApp): Enviando mensagem para ${phone} via instância ${instance}...`);

        try {
          // Evolution API Call
          const response = await fetch(`${process.env.EVOLUTION_API_URL}/message/sendText/${instance}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': process.env.EVOLUTION_API_KEY || ''
            },
            body: JSON.stringify({
              number: phone.replace(/\D/g, ''),
              text: message,
              linkPreview: true
            })
          });

          if (response.ok) {
            logs.push(`[${new Date().toISOString()}] WhatsApp enviado com sucesso.`);
          } else {
            const err = await response.text();
            logs.push(`[${new Date().toISOString()}] Erro ao enviar WhatsApp: ${err}`);
          }
        } catch (err: any) {
          logs.push(`[${new Date().toISOString()}] Erro de conexão com Evolution API: ${err.message}`);
        }
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
    // Dynamic import to avoid loading Vite in production
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  // Global Error Handler
  app.use((err: any, req: any, res: any, next: any) => {
    console.error('Uncaught Server Error:', err);
    res.status(500).json({ error: "Internal Server Error", details: err.message });
  });

  return app;
}
