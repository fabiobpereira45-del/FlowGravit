import express from "express";
const app = express();
app.use(express.json());

app.get("/api/test-express", (req, res) => res.json({ ok: true, msg: "Express minimal works!" }));

export default app;
