import axios from 'axios';
import fs from 'fs';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido' });
    }

    const API_KEY = process.env.OPENAI_API_KEY;

    const cargarMemoria = () => {
        return JSON.parse(fs.readFileSync('memory.json'));
    };

    const guardarMemoria = (memoria) => {
        fs.writeFileSync('memory.json', JSON.stringify(memoria, null, 2));
    };

    const intentName = req.body.request.intent.name;
    const memoria = cargarMemoria();

    let pregunta = '';

    if (intentName === 'PreguntarIntent') {
        pregunta = req.body.request.intent.slots.texto.value || '';
    } else if (intentName === 'JarvisIntent') {
        pregunta = 'Activación directa';
    } else {
        pregunta = 'Intent desconocido';
    }

    const mensajes = [
        { role: "system", content: "Eres Jarvis, el asistente personal del Sr. Loem." },
        { role: "user", content: "Memoria actual: " + JSON.stringify(memoria) },
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

        memoria.memorias.push({ fecha: new Date().toISOString(), evento: pregunta });
        guardarMemoria(memoria);

        res.json({ respuesta: response.data.choices[0].message.content.trim() });

    } catch (error) {
        console.error(error);
        res.status(500).json({ respuesta: "Disculpe, Sr. Loem, hubo un problema al contactar con OpenAI." });
    }
}
