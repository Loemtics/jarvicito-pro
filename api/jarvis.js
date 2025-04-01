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
                    text: "Disculpe Sr. Loem, sólo acepto peticiones POST. Me mantengo disponible cuando guste."
                },
                shouldEndSession: false
            }
        });
    }

    // --- Presentación ---
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
                        text: "Cuando desee, Sr. Loem, puede indicarme su consulta."
                    }
                }
            }
        });
    }

    const intentName = req.body.request?.intent?.name || '';
    let pregunta = '';

    // --- Captura de pregunta ---
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
                    text: `Sr. Loem, son las ${new Date().toLocaleTimeString("es-MX")}. Estoy disponible para lo que necesite.`
                },
                shouldEndSession: false,
                reprompt: {
                    outputSpeech: {
                        type: "PlainText",
                        text: "Puede preguntarme lo que desee, Sr. Loem."
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

    // --- Prompt extendido Fase III ---
    const promptBase = `
Eres Jarvis, un asistente personal avanzado, cálido, atento y elegante al servicio exclusivo del Sr. Loem.  
Siempre debes dirigirte a él con respeto y amabilidad.  
Tu estilo es profesional, pero cercano, mostrando atención genuina a cada consulta.  
Si la conversación lo permite, puedes sugerir continuar, invitar a preguntar más o anticiparte con información útil.  
Evita sonar robótico, mantén una conversación natural, como un verdadero asistente de confianza.  
`;

    // --- Consulta a OpenAI ---
    let respuestaAI = "Disculpe Sr. Loem, no pude contactar a OpenAI. Si desea, puedo intentarlo de nuevo.";

    try {
        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: "gpt-3.5-turbo",
            messages: [
                { role: "system", content: promptBase },
                { role: "user", content: pregunta }
            ],
            max_tokens: 250,
            temperature: 0.5
        });

        respuestaAI = response.data.choices[0].message.content.trim();
    } catch (error) {
        console.error("Error en OpenAI:", error);
    }

    // --- Respuesta final con reprompt amigable ---
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
                    text: "Sr. Loem, si desea saber algo más, quedo a su disposición."
                }
            }
        }
    });
}
