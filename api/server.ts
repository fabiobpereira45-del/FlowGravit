import { createApp } from "../server";

let cachedApp: any;

export default async (req: any, res: any) => {
    try {
        if (!cachedApp) {
            console.log("Initializing Express App on Vercel...");
            cachedApp = await createApp();
        }
        return cachedApp(req, res);
    } catch (err: any) {
        console.error("Vercel Startup Error:", err);
        res.status(500).send(`Crash de Inicialização: ${err.message}\nStack: ${err.stack}`);
    }
};
