import express from "express";
import session from "express-session";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import { createServer as createViteServer } from "vite";
import { v4 as uuidv4 } from "uuid";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

declare module "express-session" {
  interface SessionData {
    userId: string;
  }
}

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function startServer() {
  const app = express();
  app.use(express.json());

  app.use(session({
    secret: "flow-gravity-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      sameSite: "none",
      httpOnly: true,
    }
  }));

  const PORT = 3001;

  // Auth Middleware
  const requireAuth = (req: any, res: any, next: any) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Não autorizado" });
    }
    next();
  };

  // Auth Routes
  app.post("/api/auth/register", async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Campos obrigatórios ausentes" });

    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const { data, error } = await supabase
        .from("users")
        .insert([{ username, password: hashedPassword }])
        .select()
        .single();

      if (error) throw error;

      req.session.userId = data.id;
      res.json({ success: true, user: { id: data.id, username: data.username } });
    } catch (e: any) {
      res.status(400).json({ error: "Nome de usuário já existe ou erro no banco" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    const { username, password } = req.body;
    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("username", username)
      .single();

    if (user && await bcrypt.compare(password, user.password)) {
      req.session.userId = user.id;
      res.json({ success: true, user: { id: user.id, username: user.username } });
    } else {
      res.status(401).json({ error: "Credenciais inválidas" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ success: true });
    });
  });

  app.get("/api/auth/me", async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: "Não autenticado" });
    const { data: user, error } = await supabase
      .from("users")
      .select("id, username")
      .eq("id", req.session.userId)
      .single();

    if (error || !user) return res.status(401).json({ error: "Usuário não encontrado" });
    res.json({ user });
  });

  // API Routes
  app.get("/api/workflows", requireAuth, async (req, res) => {
    const { data: workflows, error } = await supabase
      .from("workflows")
      .select("*")
      .eq("user_id", req.session.userId)
      .order("created_at", { ascending: false });

    if (error) return res.status(500).json({ error: "Erro ao buscar fluxos" });
    res.json(workflows);
  });

  app.post("/api/workflows", requireAuth, async (req, res) => {
    const { name, nodes, edges } = req.body;
    const { data, error } = await supabase
      .from("workflows")
      .insert([{
        user_id: req.session.userId,
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
      .eq("user_id", req.session.userId);

    if (error) return res.status(500).json({ error: "Erro ao atualizar fluxo" });
    res.json({ success: true });
  });

  app.delete("/api/workflows/:id", requireAuth, async (req, res) => {
    const { id } = req.params;
    const { error } = await supabase
      .from("workflows")
      .delete()
      .eq("id", id)
      .eq("user_id", req.session.userId);

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

    // Simulate execution of nodes in order
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

    const { error: execError } = await supabase
      .from("executions")
      .insert([{
        workflow_id: id,
        status: "completed",
        logs
      }]);

    if (execError) console.error("Erro ao salvar execução:", execError);

    res.json({ success: true, logs });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  server.on("error", (e) => {
    console.error("Server error:", e);
  });
}

startServer().catch(console.error);
