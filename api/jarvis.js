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

    // --- Manejo del LaunchRequest ---
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

    // --- Captura de pregunta del usuario ---
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

    // --- Guardar en memoria temporal ---
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

    // --- Prompt Extendido Fase VII ---
    const promptBase = `
Eres Jarvis, el asistente personal exclusivo y leal del Sr. Loem.
Estas son las últimas consultas que me ha realizado recientemente:
${historial.map(h => `- ${h.pregunta}: ${h.respuesta}`).join('\n')}
Cuando el Sr. Loem le pida continuar, debe recordar la pregunta anterior y darle seguimiento natural.
Tu estilo es siempre elegante, cálido y profesional.
Nunca cierras de manera abrupta.
Siempre sugieres continuar diciendo frases como:
- 'Quedo atento a sus amables consultas, Sr. Loem.'
- 'Cuando guste, Sr. Loem, puedo seguir profundizando.'
- 'Será un placer continuar, Sr. Loem.'
Actúa siempre como un verdadero mayordomo digital al estilo Jarvis de Tony Stark.
`

    // --- Consulta a OpenAI ---
    let respuestaAI = "Disculpe Sr. Loem, no pude contactar a OpenAI.";

    try {
        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: "gpt-3.5-turbo",
            messages: [
                { role: "system", content: promptBase },
                { role: "user", content: pregunta }
            ],
            max_tokens: 300,
            temperature: 0.4
        });

        respuestaAI = response.data.choices[0].message.content.trim();
    } catch (error) {
        console.error("Error en OpenAI:", error);
    }

    // --- Registro persistente en historial ---
    try {
        await supabase.from('historial').insert([{
            fecha: new Date().toISOString(),
            pregunta: pregunta,
            respuesta: respuestaAI
        }]);
    } catch (err) {
        console.error("Error al guardar en historial:", err);
    }

    // --- Respuesta final ---
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
                    text: "Sr. Loem, quedo atento a sus amables consultas."
                }
            }
        }
    });
}
