const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const fs = require('fs');

const app = express();
app.use(bodyParser.json());

const API_KEY = process.env.OPENAI_API_KEY;

const cargarMemoria = () => {
    return JSON.parse(fs.readFileSync('memory.json'));
};

const guardarMemoria = (memoria) => {
    fs.writeFileSync('memory.json', JSON.stringify(memoria, null, 2));
};

app.post('/jarvis', async (req, res) => {
    const pregunta = req.body.texto || '';
    const memoria = cargarMemoria();

    const mensajes = [
        { role: "system", content: "Eres Jarvis, un asistente personal leal y profesional que sirve al Sr. Loem." },
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

        const respuesta = response.data.choices[0].message.content.trim();

        // Actualizar memoria con la nueva pregunta
        memoria.memorias.push({ fecha: new Date().toISOString(), evento: pregunta, respuesta: respuesta });
        guardarMemoria(memoria);

        res.json({ respuesta });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ respuesta: "Disculpe, Sr. Loem, hubo un problema al contactar con OpenAI." });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Jarvis Pro escuchando en el puerto ${PORT}`));
