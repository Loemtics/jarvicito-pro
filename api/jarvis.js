import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido' });
    }

    const API_KEY = process.env.OPENAI_API_KEY;
    const intentName = req.body.request.intent.name;
    let pregunta = '';

    if (intentName === 'PreguntarIntent') {
        pregunta = req.body.request.intent.slots.texto.value || '';
    } else if (intentName === 'JarvisIntent') {
        pregunta = 'Activación';
    } else {
        pregunta = 'No se reconoció el intent.';
    }

    // Guardar pregunta en Supabase
    await supabase.from('memoria').insert([
        { pregunta }
    ]);

    const mensajes = [
        { role: "system", content: "Eres Jarvis, un asistente personal leal y profesional al servicio del Sr. Loem." },
        { role: "user", content: pregunta }
    ];

    try {
        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: "gpt-3.5-turbo",
            messages: mensajes,
            max_tokens: 200
        }, {
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        const respuesta = response.data.choices[0].message.content.trim();
        res.json({ respuesta });

    } catch (error) {
        console.error(error);
        res.status(500).json({ respuesta: "Disculpe, Sr. Loem, hubo un problema al contactar con OpenAI." });
    }
}
export async function configTest(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Método no permitido' });
    }

    res.json({
        openai_key: !!process.env.OPENAI_API_KEY,
        supabase_url: !!process.env.SUPABASE_URL,
        supabase_key: !!process.env.SUPABASE_ANON_KEY
    });
}
