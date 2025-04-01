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
                    text: "Disculpe Sr. Loem, sólo acepto peticiones POST. Estaré esperando su instrucción."
                },
                shouldEndSession: false
            }
        });
    }

    // --- Respuesta de bienvenida ---
    if (req.body.request?.type === 'LaunchRequest') {
        return res.json({
            version: "1.0",
            response: {
                outputSpeech: {
                    type: "PlainText",
                    text: "Estoy atento a sus amables consultas, Sr. Loem."
                },
                shouldEndSession: false,
                reprompt: {
                    outputSpeech: {
                        type: "PlainText",
                        text: "Sr. Loem, cuando guste puede indicarme una consulta."
                    }
                }
            }
        });
    }

    const intentName = req.body.request?.intent?.name || '';
    let pregunta = '';

    // --- Detección e inyección automática ---
    if (intentName === 'PreguntarIntent' || intentName === 'JarvisIntent') {
        let slotTexto = req.body.request.intent.slots?.texto?.value || '';

        if (!slotTexto.trim()) {
            slotTexto = 'Jarvis';
        }

        pregunta = `Jarvis ${slotTexto}`;
    } else {
        pregunta = 'El Sr. Loem ha solicitado un comando no reconocido.';
    }

    // --- Manejo especial de la hora ---
    if (pregunta.toLowerCase().includes("hora")) {
        return res.json({
            version: "1.0",
            response: {
                outputSpeech: {
                    type: "PlainText",
                    text: `Sr. Loem, son las ${new Date().toLocaleTimeString("es-MX")}. Estoy disponible si desea saber algo más.`
                },
                shouldEndSession: false,
                reprompt: {
                    outputSpeech: {
                        type: "PlainText",
                        text: "Cuando guste, Sr. Loem, puede hacerme otra consulta."
                    }
                }
            }
        });
    }

    // --- Registro de la consulta ---
    try {
        await supabase.from('memoria').insert([{ pregunta }]);
    } catch (err) {
        console.error("Error al guardar en Supabase:", err);
    }

    // --- Consulta a OpenAI ---
    let respuestaAI = "Disculpe Sr. Loem, no pude contactar a OpenAI. Si lo desea, puedo intentarlo de nuevo.";

    try {
        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: "gpt-3.5-turbo",
            messages: [
                { role: "system", content: "Eres Jarvis, un asistente personal leal, atento, cálido y elegante al servicio exclusivo del Sr. Loem. Tu tono siempre es humano, respetuoso, amable y profesional." },
                { role: "user", content: pregunta }
            ],
            max_tokens: 180,
            temperature: 0.5
        });

        respuestaAI = response.data.choices[0].message.content.trim();
    } catch (error) {
        console.error("Error en OpenAI:", error);
    }

    // --- Respuesta final con reprompt ---
    return res.json({
        version: "1.0",
        response: {
            outputSpeech: {
                type: "PlainText",
                text: respuestaAI
            },
            shouldEndSession: false,
            reprompt: {
                outputSpeech: {
                    type: "PlainText",
                    text: "Sr. Loem, si desea saber algo más, estaré encantado de escucharle."
                }
            }
        }
    });
}
