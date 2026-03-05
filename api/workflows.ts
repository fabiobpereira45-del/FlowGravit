import { createClient } from "@supabase/supabase-js";

const getSupabase = () => createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
);

const requireAuth = async (req: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) throw new Error("Não autorizado");
    const token = authHeader.split(" ")[1];
    if (!token) throw new Error("Token ausente");
    const supabase = getSupabase();
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) throw new Error("Sessão inválida");
    return { user, supabase };
};

export default async function handler(req: any, res: any) {
    // Set CORS headers
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") {
        return res.status(200).end();
    }

    try {
        const { user, supabase } = await requireAuth(req);

        if (req.method === "GET") {
            const { data: workflows, error } = await supabase
                .from("workflows")
                .select("*")
                .eq("user_id", user.id)
                .order("created_at", { ascending: false });

            if (error) {
                console.error("Supabase GET error:", error);
                return res.status(500).json({ error: error.message });
            }
            return res.status(200).json(workflows);

        } else if (req.method === "POST") {
            const { name, nodes, edges } = req.body;
            console.log("Creating workflow for user:", user.id);

            const { data, error } = await supabase
                .from("workflows")
                .insert([{ user_id: user.id, name: name || "Nova Automação", nodes, edges }])
                .select()
                .single();

            if (error) {
                console.error("Supabase INSERT error:", error);
                return res.status(500).json({ error: error.message });
            }
            return res.status(200).json({ id: data.id });

        } else {
            return res.status(405).json({ error: "Método não permitido" });
        }
    } catch (err: any) {
        console.error("Handler error:", err);
        return res.status(401).json({ error: err.message });
    }
}
