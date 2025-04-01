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

    // Manejo de LaunchRequest (cuando dice: Alexa abre Jarvis)
    if (req.body.request?.type === 'LaunchRequest') {
        return res.json({
            version: "1.0",
            response: {
                outputSpeech: {
                    type: "PlainText",
                    text: "A sus órdenes, Sr. Loem. Puede hacerme cualquier pregunta."
                },
                shouldEndSession: false
            }
        });
    }

    const API_KEY = process.env.OPENAI_API_KEY;
    const intentName = req.body.request?.intent?.name || '';
    let pregunta = '';

    // Manejo del intent personalizado
    if (intentName === 'PreguntarIntent') {
        pregunta = req.body.request.intent.slots?.texto?.value || '';
    } else {
        pregunta = 'No se reconoció el intent.';
    }

    // Guardar la pregunta en Supabase
    try {
        await supabase.from('memoria').insert([{ pregunta }]);
    } catch (err) {
        console.error("Error al guardar en Supabase:", err);
    }

    // Solicitud a OpenAI
    let respuestaAI = "Disculpe Sr. Loem, no pude contactar a OpenAI.";

    try {
        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: "gpt-3.5-turbo",
            messages: [
                { role: "system", content: "Eres Jarvis, un asistente personal leal y profesional al servicio del Sr. Loem." },
                { role: "user", content: pregunta }
            ],
            max_tokens: 200
        }, {
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        respuestaAI = response.data.choices[0].message.content.trim();
    } catch (error) {
        console.error("Error en OpenAI:", error);
    }

    // Devolver respuesta en formato Alexa correcto
    res.json({
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
