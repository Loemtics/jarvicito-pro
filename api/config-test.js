export default async function handler(req, res) {
    res.json({
        openai_key: !!process.env.OPENAI_API_KEY,
        supabase_url: !!process.env.SUPABASE_URL,
        supabase_key: !!process.env.SUPABASE_ANON_KEY
    });
}
