// api/create-pix-payment.js
const { MercadoPagoClient } = require('mercadopago');

// ✅ NOVA CREDENCIAL
const MP_ACCESS_TOKEN = 'APP_USR-2472261822250012-061108-946d853d79aee4085db53cc91d239891-256186484';
const mp = new MercadoPagoClient({ accessToken: MP_ACCESS_TOKEN });

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { planId, userId, userEmail } = req.body;

  // ✅ CORREÇÃO: Usar 'plus' em vez de 'pro'
  const plans = {
    premium: { value: 29.90, name: 'Plano Premium Vitalício' },
    plus: { value: 49.90, name: 'Plano Plus Vitalício' }
  };

  const plan = plans[planId];
  if (!plan) {
    return res.status(400).json({ error: `Plano inválido: ${planId}` });
  }

  try {
    const payment = await mp.payment.create({
      transaction_amount: plan.value,
      description: plan.name,
      payment_method_id: 'pix',
      payer: { email: userEmail || 'cliente@email.com' },
      external_reference: userId,
      notification_url: 'https://seu-projeto.vercel.app/api/mercadopago-webhook'
    });

    res.json({
      success: true,
      qrCode: payment.point_of_interaction.transaction_data.qr_code,
      qrCodeBase64: payment.point_of_interaction.transaction_data.qr_code_base64,
      paymentId: payment.id,
      pixCopyPaste: payment.point_of_interaction.transaction_data.qr_code
    });
  } catch (error) {
    console.error('Erro:', error);
    res.status(500).json({ error: 'Erro ao criar pagamento: ' + error.message });
  }
};