import axios from 'axios';

export const verificarOpenAI = async () => {
    try {
        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: "gpt-3.5-turbo",
            messages: [{ role: "system", content: "Verificación de conexión con OpenAI." }]
        }, {
            headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        console.log('Conexión exitosa con OpenAI', response.data);
    } catch (error) {
        console.error('Error en la conexión con OpenAI:', error);
    }
};
