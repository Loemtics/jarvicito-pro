import axios from 'axios';

export default async function handler(req, res) {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
        return res.status(500).json({
            error: 'No se encontró la variable OPENAI_API_KEY.',
            recomendacion: 'Revise las variables de entorno en Vercel.'
        });
    }

    try {
        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: "gpt-3.5-turbo",
            messages: [{ role: "user", content: "Test de conectividad Jarvis" }],
            max_tokens: 20,
            temperature: 0.2
        }, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        return res.status(200).json({
            estado: "✅ Conexión exitosa con OpenAI",
            modelo: response.data.model || "Desconocido",
            mensaje_de_openai: response.data.choices[0].message.content,
            recomendacion: "Su Jarvis debería estar listo para operar"
        });

    } catch (error) {
        return res.status(500).json({
            estado: "❌ Error al conectar con OpenAI",
            tipo: error.response?.status || "Desconocido",
            detalle: error.response?.data || error.message,
            posibles_causas: [
                "API Key inválida o mal copiada",
                "El modelo no está habilitado en su cuenta",
                "Problemas de billing o límite alcanzado",
                "Error temporal en OpenAI"
            ],
            recomendacion: "Revise su API Key, billing y disponibilidad del modelo"
        });
    }
}
