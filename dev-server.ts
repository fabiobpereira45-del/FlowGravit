import app from "./server";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

async function startDevServer() {
    console.log("Starting Development Server...");

    // Create Vite server in middleware mode
    const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa"
    });

    // Use vite's connect instance as middleware
    app.use(vite.middlewares);

    const PORT = Number(process.env.PORT) || 3001;
    app.listen(PORT, "0.0.0.0", () => {
        console.log(`\n🚀 Dev server running at: http://localhost:${PORT}`);
    });
}

startDevServer().catch((err) => {
    console.error("Failed to start dev server:", err);
    process.exit(1);
});
