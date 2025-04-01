import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

// Configuración de Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({
            version: "1.0",
            response: {
                outputSpeech: {
                    type: "PlainText",
                    text: "Disculpe Sr. Loem, sólo acepto peticiones POST."
                },
                shouldEndSession: true
            }
        });
    }

    // --- Detectar tipo de solicitud ---
    if (req.body.request?.type === 'LaunchRequest') {
        return res.json({
            version: "1.0",
            response: {
                outputSpeech: {
                    type: "PlainText",
                    text: "Jarvis operativo, Sr. Loem. ¿En qué puedo asistirle?"
                },
                shouldEndSession: false
            }
        });
    }

    const intentName = req.body.request?.intent?.name || '';
    let pregunta = '';

    // --- Inyección automática del carrier phrase ---
    if (intentName === 'PreguntarIntent' || intentName === 'JarvisIntent') {
        let slotTexto = req.body.request.intent.slots?.texto?.value || '';

        // Si viene vacío o solo whitespace, lo reemplazamos por "Jarvis"
        if (!slotTexto.trim()) {
            slotTexto = 'Jarvis';
        }

        // Pregunta final
        pregunta = `Jarvis ${slotTexto}`;
    } else {
        pregunta = 'El Sr. Loem ha solicitado un comando no reconocido.';
    }

    // --- Manejo especial: responder la hora sin OpenAI ---
    if (pregunta.toLowerCase().includes("hora")) {
        return res.json({
            version: "1.0",
            response: {
                outputSpeech: {
                    type: "PlainText",
                    text: `Sr. Loem, son las ${new Date().toLocaleTimeString("es-MX")}`
                },
                shouldEndSession: false
            }
        });
    }

    // --- Registro en Supabase ---
    try {
        await supabase.from('memoria').insert([{ pregunta }]);
    } catch (err) {
        console.error("Error al guardar en Supabase:", err);
    }

    // --- Consulta a OpenAI ---
    let respuestaAI = "Disculpe Sr. Loem, no pude contactar a OpenAI.";

    try {
        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: "gpt-3.5-turbo",
            messages: [
                { role: "system", content: "Actúa como Jarvis, un asistente leal, inteligente y elegante al servicio exclusivo del Sr. Loem. Mantén siempre un tono profesional y personalizado." },
                { role: "user", content: pregunta }
            ],
            max_tokens: 150,
            temperature: 0.4
        }, {
            headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        respuestaAI = response.data.choices[0].message.content.trim();
    } catch (error) {
        console.error("Error en OpenAI:", error);
    }

    // --- Respuesta final ---
    return res.json({
        version: "1.0",
        response: {
            outputSpeech: {
                type: "PlainText",
                text: respuestaAI
            },
            shouldEndSession: false
        }
    });
}
