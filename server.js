<<<<<<< HEAD
// backend/server.js
const express = require('express');
const cors = require('cors');

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
    
=======
const express = require('express');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

const MP_ACCESS_TOKEN = 'APP_USR-3288422422446137-120908-9f926eedb3da794f9a10b88cb4c956e4-256186484';
const MP_API_URL = 'https://api.mercadopago.com/v1';

// Rota de pagamento
app.post('/api/mercadopago', async (req, res) => {
  const { action, planId, userId, userEmail, paymentId } = req.body;

  if (action === 'create_pix') {
    const plans = {
      premium: { value: 199.90, name: 'Plano Premium Vitalício' },
      pro: { value: 349.90, name: 'Plano Pro Plus Vitalício' }
    };

    const plan = plans[planId];
    if (!plan) return res.status(400).json({ error: 'Plano inválido' });

>>>>>>> 51d92525a1b573641347650603f6b1f73a14ebb2
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
<<<<<<< HEAD
      
      const payment = await response.json();
      
      if (!response.ok) {
        return res.status(500).json({ error: payment.message || 'Erro ao criar pagamento' });
      }
      
=======

      const payment = await response.json();

      if (!response.ok) {
        return res.status(500).json({ error: payment.message || 'Erro ao criar pagamento' });
      }

>>>>>>> 51d92525a1b573641347650603f6b1f73a14ebb2
      return res.json({
        success: true,
        paymentId: payment.id,
        qrCodeBase64: payment.point_of_interaction?.transaction_data?.qr_code_base64,
<<<<<<< HEAD
        pixCopyPaste: payment.point_of_interaction?.transaction_data?.qr_code,
        value: payment.transaction_amount
      });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }
  
  if (action === 'check_status') {
    const { paymentId } = req.body;
=======
        pixCopyPaste: payment.point_of_interaction?.transaction_data?.qr_code
      });
    } catch (error) {
      return res.status(500).json({ error: 'Erro ao criar pagamento' });
    }
  }

  if (action === 'check_status') {
>>>>>>> 51d92525a1b573641347650603f6b1f73a14ebb2
    try {
      const response = await fetch(`${MP_API_URL}/payments/${paymentId}`, {
        headers: { 'Authorization': `Bearer ${MP_ACCESS_TOKEN}` }
      });
      const payment = await response.json();
<<<<<<< HEAD
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
=======

      return res.json({
        status: payment.status,
        confirmedDate: payment.date_approved
      });
    } catch (error) {
      return res.status(500).json({ error: 'Erro ao verificar pagamento' });
    }
  }

  return res.status(400).json({ error: 'Ação inválida' });
});

// Health check
app.get('/', (req, res) => res.send('API Mercado Pago - KETO+'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
>>>>>>> 51d92525a1b573641347650603f6b1f73a14ebb2
