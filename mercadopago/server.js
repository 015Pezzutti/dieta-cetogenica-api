// server.js
import express from 'express';
import cors from 'cors';

const app = express();

app.use(cors());
app.use(express.json());

// Configuração do Mercado Pago
const MP_ACCESS_TOKEN = 'APP_USR-2472261822250012-061108-946d853d79aee4085db53cc91d239891-256186484';
const MP_API_URL = 'https://api.mercadopago.com/v1';

// Rota de health check para o Render
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Rota principal da API - Criação do PIX
app.post('/api/mercadopago', async (req, res) => {
  const { action, planId, userId, userEmail, paymentId } = req.body;

  console.log('📥 Requisição recebida:', { action, planId, userId });

  const plans = {
    premium: { value: 29.90, name: 'Plano Premium Vitalício' },
    plus: { value: 49.90, name: 'Plano Plus Vitalício' }
  };

  // Ação: Criar PIX
  if (action === 'create_pix') {
    const plan = plans[planId];
    
    if (!plan) {
      console.error('❌ Plano inválido:', planId);
      return res.status(400).json({ 
        error: `Plano inválido: "${planId}". Planos disponíveis: premium, plus` 
      });
    }

    console.log('✅ Criando PIX para:', plan.name, 'R$', plan.value);

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
        console.error('❌ Erro do Mercado Pago:', payment);
        return res.status(500).json({ 
          error: payment.message || 'Erro ao criar pagamento',
          details: payment 
        });
      }

      console.log('✅ PIX criado! ID:', payment.id);

      return res.status(200).json({
        success: true,
        paymentId: payment.id,
        qrCode: payment.point_of_interaction?.transaction_data?.qr_code,
        qrCodeBase64: payment.point_of_interaction?.transaction_data?.qr_code_base64,
        pixCopyPaste: payment.point_of_interaction?.transaction_data?.qr_code,
        value: payment.transaction_amount
      });
    } catch (error) {
      console.error('❌ Erro na requisição:', error);
      return res.status(500).json({ error: 'Erro ao criar pagamento: ' + error.message });
    }
  }

  // Ação: Verificar status do pagamento
  if (action === 'check_status') {
    try {
      console.log('🔍 Verificando status do pagamento:', paymentId);
      
      const response = await fetch(`${MP_API_URL}/payments/${paymentId}`, {
        headers: { 'Authorization': `Bearer ${MP_ACCESS_TOKEN}` }
      });
      const payment = await response.json();

      if (!response.ok) {
        return res.status(500).json({ error: payment.message || 'Erro ao verificar pagamento' });
      }

      console.log('✅ Status do pagamento:', payment.status);

      return res.status(200).json({
        status: payment.status,
        confirmedDate: payment.date_approved,
        value: payment.transaction_amount
      });
    } catch (error) {
      console.error('❌ Erro ao verificar status:', error);
      return res.status(500).json({ error: 'Erro ao verificar pagamento' });
    }
  }

  return res.status(400).json({ error: 'Ação inválida' });
});

// Rota para OPTIONS (CORS preflight)
app.options('/api/mercadopago', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.status(200).end();
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📡 Endpoint: https://dieta-cetogenica-api.onrender.com/api/mercadopago`);
});