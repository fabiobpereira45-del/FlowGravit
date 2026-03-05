import { createClient } from "@supabase/supabase-js";

const getSupabase = (req: any) => {
    const url = process.env.SUPABASE_URL || req.headers['x-supabase-url'];
    const key = process.env.SUPABASE_ANON_KEY || req.headers['x-supabase-key'];
    if (!url || !key) throw new Error("Supabase credentials missing");
    return createClient(url, key);
};

const requireAuth = async (req: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) throw new Error("Não autorizado");
    const token = authHeader.split(" ")[1];
    if (!token) throw new Error("Token ausente");
    const supabase = getSupabase(req);
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) throw new Error("Sessão inválida");
    return { user, supabase };
};

export default async function handler(req: any, res: any) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") {
        return res.status(200).end();
    }

    try {
        const { user, supabase } = await requireAuth(req);
        const id = req.query.id as string;

        if (!id) {
            return res.status(400).json({ error: "ID do fluxo não informado" });
        }

        if (req.method === "PUT") {
            const { name, nodes, edges } = req.body;
            const { error } = await supabase
                .from("workflows")
                .update({ name, nodes, edges })
                .eq("id", id)
                .eq("user_id", user.id);

            if (error) {
                console.error("Supabase UPDATE error:", error);
                return res.status(500).json({ error: error.message });
            }
            return res.status(200).json({ success: true });

        } else if (req.method === "DELETE") {
            const { error } = await supabase
                .from("workflows")
                .delete()
                .eq("id", id)
                .eq("user_id", user.id);

            if (error) {
                console.error("Supabase DELETE error:", error);
                return res.status(500).json({ error: error.message });
            }
            return res.status(200).json({ success: true });

        } else {
            return res.status(405).json({ error: "Método não permitido" });
        }
    } catch (err: any) {
        console.error("Handler error:", err);
        return res.status(401).json({ error: err.message });
    }
}
