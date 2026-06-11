// server.js
import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Rota PIX
app.post('/api/mercadopago', async (req, res) => {
  const { action, planId, userId, userEmail } = req.body;
  
  console.log('📥 Requisição recebida:', { action, planId });
  
  const MP_ACCESS_TOKEN = 'APP_USR-2472261822250012-061108-946d853d79aee4085db53cc91d239891-256186484';
  const MP_API_URL = 'https://api.mercadopago.com/v1';
  
  const plans = {
    premium: { value: 29.90, name: 'Plano Premium Vitalício' },
    plus: { value: 49.90, name: 'Plano Plus Vitalício' }
  };
  
  if (action === 'create_pix') {
    const plan = plans[planId];
    
    if (!plan) {
      return res.status(400).json({ error: `Plano inválido: ${planId}` });
    }
    
    try {
      const response = await fetch(`${MP_API_URL}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${MP_ACCESS_TOKEN}`
        },
        body: JSON.stringify({
          transaction_amount: plan.value,
          description: plan.name,
          payment_method_id: 'pix',
          payer: { email: userEmail || 'cliente@email.com' },
          external_reference: userId
        })
      });
      
      const payment = await response.json();
      
      if (!response.ok) {
        return res.status(500).json({ error: payment.message || 'Erro ao criar pagamento' });
      }
      
      return res.json({
        success: true,
        paymentId: payment.id,
        qrCodeBase64: payment.point_of_interaction?.transaction_data?.qr_code_base64,
        pixCopyPaste: payment.point_of_interaction?.transaction_data?.qr_code,
        value: payment.transaction_amount
      });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }
  
  if (action === 'check_status') {
    const { paymentId } = req.body;
    try {
      const response = await fetch(`${MP_API_URL}/payments/${paymentId}`, {
        headers: { 'Authorization': `Bearer ${MP_ACCESS_TOKEN}` }
      });
      const payment = await response.json();
      return res.json({ status: payment.status });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }
  
  return res.status(400).json({ error: 'Ação inválida' });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});