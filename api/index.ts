import express from "express";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

const getSupabase = () => {
    const supabaseUrl = process.env.SUPABASE_URL || "";
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || "";
    return createClient(supabaseUrl, supabaseAnonKey);
};

const supabase = getSupabase();

app.get("/api/test-supabase", async (req, res) => {
    try {
        const { data, error } = await supabase.from("workflows").select("id").limit(1);
        if (error) throw error;
        res.json({ ok: true, msg: "Supabase connected!", count: data?.length });
    } catch (err: any) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

export default app;
