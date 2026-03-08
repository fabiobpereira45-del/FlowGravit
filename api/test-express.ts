import express from "express";
const app = express();
app.get("/api/test-express", (req, res) => res.json({ ok: true, msg: "Express working!" }));
export default app;
