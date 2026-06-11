// server.js
import express from 'express';
import cors from 'cors';
import mercadopagoHandler from './api/mercadopago.js';

const app = express();

app.use(cors());
app.use(express.json());

// Rota principal da API
app.post('/api/mercadopago', mercadopagoHandler);
app.options('/api/mercadopago', mercadopagoHandler);

// Health check para o Render
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📡 Endpoint: http://localhost:${PORT}/api/mercadopago`);
});