import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

// Configuración
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Manejador principal
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

    const intentName = req.body.request?.intent?.name || '';
    const sessionAttributes = req.body.session?.attributes || {};
    let pregunta = '';

    // Captura de pregunta
    if (intentName === 'PreguntarIntent' || intentName === 'JarvisIntent') {
        pregunta = req.body.request.intent.slots?.texto?.value || '';
        console.log("Pregunta recibida:", pregunta);
    }

    // Fallback
    if (!pregunta || pregunta.trim() === '') {
        return res.json({
            version: "1.0",
            response: {
                outputSpeech: {
                    type: "PlainText",
                    text: "Disculpe Sr. Loem, no logré entender su petición. Puede repetirla."
                },
                shouldEndSession: false
            }
        });
    }

    // Registro en Supabase
    try {
        await supabase.from('memoria').insert([{ pregunta }]);
    } catch (err) {
        console.error("Error al guardar en Supabase:", err);
    }

    // Contexto anterior de la sesión (memoria de corto plazo)
    const historial = sessionAttributes.historial || [];
    historial.push({ role: "user", content: pregunta });

    // Generación de mensajes para OpenAI
    const mensajes = [
        { role: "system", content: "Eres Jarvis, un asistente personal elegante, leal y eficiente al servicio exclusivo del Sr. Loem. Siempre debes mantener continuidad en las conversaciones y recordar detalles de la sesión actual." },
        ...historial
    ];

    // Consulta a OpenAI
    let respuestaAI = "Disculpe Sr. Loem, no pude contactar a OpenAI.";

    try {
        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: "gpt-3.5-turbo",
            messages: mensajes,
            max_tokens: 250,
            temperature: 0.5
        }, {
            headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        respuestaAI = response.data.choices[0].message.content.trim();
        historial.push({ role: "assistant", content: respuestaAI });

    } catch (error) {
        console.error("Error en OpenAI:", error);
    }

    // Respuesta final con contexto almacenado
    res.json({
        version: "1.0",
        sessionAttributes: {
            historial: historial.slice(-5) // Guardamos sólo las últimas 5 interacciones para mantenerlo ligero
        },
        response: {
            outputSpeech: {
                type: "PlainText",
                text: `${respuestaAI}`
            },
            shouldEndSession: false
        }
    });
}
