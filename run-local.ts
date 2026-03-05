import { createApp } from "./server";

async function run() {
    const app = await createApp();
    const PORT = Number(process.env.PORT) || 3001;
    app.listen(PORT, "0.0.0.0", () => {
        console.log(`Local server running on http://localhost:${PORT}`);
    });
}

run().catch(console.error);
