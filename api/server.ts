import { createApp } from "../server";

let cachedApp: any;

export default async (req: any, res: any) => {
    let logs = [];
    try {
        logs.push("Passo 1: Iniciando handler...");
        if (!cachedApp) {
            logs.push("Passo 2: Chamando createApp()...");
            cachedApp = await createApp();
            logs.push("Passo 3: createApp() concluído.");
        }
        logs.push("Passo 4: Executando app instance...");
        return cachedApp(req, res);
    } catch (err: any) {
        console.error("Vercel Startup Error:", err);
        const logContent = logs.join("\n");
        res.status(500).send(`
            <h1>Crash de Inicialização</h1>
            <pre>${logContent}</pre>
            <hr>
            <h3>Erro:</h3>
            <pre>${err.message}</pre>
            <h3>Stack:</h3>
            <pre>${err.stack}</pre>
        `);
    }
};
