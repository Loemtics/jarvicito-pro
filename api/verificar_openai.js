import axios from 'axios';

export default async function handler(req, res) {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: 'No se encontró la OPENAI_API_KEY en las variables de entorno.' });
    }

    try {
        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: "gpt-3.5-turbo",
            messages: [{ role: "user", content: "¿Puedes confirmarme que estás funcionando correctamente?" }],
            max_tokens: 20,
            temperature: 0.2
        }, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        return res.status(200).json({
            mensaje: "✅ API Key funcionando correctamente, Sr. Loem.",
            respuesta: response.data.choices[0].message.content
        });

    } catch (error) {
        console.error("Error al contactar OpenAI:", error.response?.data || error.message);
        return res.status(500).json({
            error: "❌ No se pudo contactar a OpenAI.",
            detalle: error.response?.data || error.message
        });
    }
}
