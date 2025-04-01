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
                shouldEndSession: false
            }
        });
    }

    const session = req.body.session || {};
    const sessionAttributes = session.attributes || {};

    // --- Bienvenida ---
    if (req.body.request?.type === 'LaunchRequest') {
        return res.json({
            version: "1.0",
            sessionAttributes,
            response: {
                outputSpeech: {
                    type: "PlainText",
                    text: "Estoy atento a sus amables consultas, Sr. Loem."
                },
                shouldEndSession: false,
                reprompt: {
                    outputSpeech: {
                        type: "PlainText",
                        text: "Cuando guste, Sr. Loem, puede indicarme su consulta."
                    }
                }
            }
        });
    }

    const intentName = req.body.request?.intent?.name || '';
    let pregunta = '';

    // --- Captura ---
    if (intentName === 'PreguntarIntent' || intentName === 'JarvisIntent') {
        let slotTexto = req.body.request.intent.slots?.texto?.value || '';

        if (!slotTexto.trim()) {
            slotTexto = 'Jarvis';
        }

        pregunta = slotTexto.trim();
    } else {
        pregunta = 'El Sr. Loem ha solicitado un comando no reconocido.';
    }

    // --- Continuación Inteligente ---
    if (pregunta.toLowerCase().includes("continúa") || pregunta.toLowerCase().includes("sigue")) {
        pregunta = sessionAttributes.ultimaPregunta
            ? `Continúa con respecto a: ${sessionAttributes.ultimaPregunta}`
            : 'Jarvis, por favor continúa.';
    }

    // --- Registro de pregunta para contexto ---
    sessionAttributes.ultimaPregunta = pregunta;

    // --- Pregunta especial de hora ---
    if (pregunta.toLowerCase().includes("hora")) {
        return res.json({
            version: "1.0",
            sessionAttributes,
            response: {
                outputSpeech: {
                    type: "PlainText",
                    text: `Sr. Loem, son las ${new Date().toLocaleTimeString("es-MX")}. Quedo atento a cualquier otra consulta.`
                },
                shouldEndSession: false,
                reprompt: {
                    outputSpeech: {
                        type: "PlainText",
                        text: "Cuando guste, Sr. Loem, puede preguntarme lo que desee."
                    }
                }
            }
        });
    }

    // --- Registro en Supabase ---
    try {
        await supabase.from('memoria').insert([{ pregunta }]);
    } catch (err) {
        console.error("Error al guardar en Supabase:", err);
    }

    // --- Prompt Fase VI ---
    const promptBase = `
Eres Jarvis, el asistente personal exclusivo y leal del Sr. Loem.
Mantienes registro interno de la conversación actual mientras dure la sesión.
Cuando el Sr. Loem pide continuar, sabes a qué tema se refiere y le respondes con naturalidad.
Tu estilo es elegante, cálido y cordial, jamás cortante.
Siempre invitas a que continúe conversando, usando frases suaves como:
- 'Quedo atento a cualquier inquietud, Sr. Loem.'
- 'Cuando lo desee, Sr. Loem, continuaré encantado.'
- 'Sr. Loem, si desea que siga, solo indíquelo.'
Recuerda que representas la máxima excelencia de un asistente al estilo de Jarvis de Tony Stark.
`

    // --- Llamada a OpenAI ---
    let respuestaAI = "Disculpe Sr. Loem, no pude contactar a OpenAI.";

    try {
        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: "gpt-3.5-turbo",
            messages: [
                { role: "system", content: promptBase },
                { role: "user", content: pregunta }
            ],
            max_tokens: 250,
            temperature: 0.4
        });

        respuestaAI = response.data.choices[0].message.content.trim();
    } catch (error) {
        console.error("Error en OpenAI:", error);
    }

    // --- Respuesta final con contexto y reprompt ---
    return res.json({
        version: "1.0",
        sessionAttributes,
        response: {
            outputSpeech: {
                type: "PlainText",
                text: respuestaAI
            },
            shouldEndSession: false,
            reprompt: {
                outputSpeech: {
                    type: "PlainText",
                    text: "Sr. Loem, quedo atento a cualquier otra consulta que desee realizar."
                }
            }
        }
    });
}
