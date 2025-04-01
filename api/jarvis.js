import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

// Configuración
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

    if (req.body.request?.type === 'LaunchRequest') {
        return res.json({
            version: "1.0",
            response: {
                outputSpeech: {
                    type: "PlainText",
                    text: "Jarvis operativo. A sus órdenes, Sr. Loem. Puede preguntarme lo que desee."
                },
                shouldEndSession: false
            }
        });
    }

    const intentName = req.body.request?.intent?.name || '';
    let pregunta = '';

    if (intentName === 'PreguntarIntent' || intentName === 'JarvisIntent') {
        pregunta = req.body.request.intent.slots?.texto?.value || '';
        console.log("Pregunta recibida:", pregunta);
    }

    // Aquí solo evitamos que se mande vacío, sin forzar a fallback agresivo
    if (!pregunta || pregunta.trim() === '') {
        pregunta = "¿En qué puedo ayudarte hoy?";
    }

    // Registro en Supabase
    try {
        await supabase.from('memoria').insert([{ pregunta }]);
    } catch (err) {
        console.error("Error al guardar en Supabase:", err);
    }

    // Consulta a OpenAI
    let respuestaAI = "Disculpe Sr. Loem, no pude contactar a OpenAI.";

    try {
        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: "gpt-3.5-turbo",
            messages: [
                { role: "system", content: "Eres Jarvis, un asistente personal leal, educado y eficiente al servicio exclusivo del Sr. Loem." },
                { role: "user", content: pregunta }
            ],
            max_tokens: 200,
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

    // Respuesta final
    res.json({
        version: "1.0",
        response: {
            outputSpeech: {
                type: "PlainText",
                text: `Perfecto, Sr. Loem. ${respuestaAI}`
            },
            shouldEndSession: false
        }
    });
}
