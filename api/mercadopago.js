export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action, planId, userId, userEmail, paymentId } = req.body;

  const MP_ACCESS_TOKEN = 'APP_USR-3288422422446137-120908-9f926eedb3da794f9a10b88cb4c956e4-256186484';
  const MP_API_URL = 'https://api.mercadopago.com/v1';

  if (action === 'create_pix') {
    const plans = {
      premium: { value: 199.90, name: 'Plano Premium Vitalício' },
      pro: { value: 349.90, name: 'Plano Pro Plus Vitalício' }
    };

    const plan = plans[planId];
    if (!plan) {
      return res.status(400).json({ error: 'Plano inválido' });
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

      return res.status(200).json({
        success: true,
        paymentId: payment.id,
        qrCodeBase64: payment.point_of_interaction?.transaction_data?.qr_code_base64,
        pixCopyPaste: payment.point_of_interaction?.transaction_data?.qr_code
      });
    } catch (error) {
      return res.status(500).json({ error: 'Erro ao criar pagamento' });
    }
  }

  if (action === 'check_status') {
    try {
      const response = await fetch(`${MP_API_URL}/payments/${paymentId}`, {
        headers: { 'Authorization': `Bearer ${MP_ACCESS_TOKEN}` }
      });
      const payment = await response.json();

      return res.status(200).json({
        status: payment.status,
        confirmedDate: payment.date_approved
      });
    } catch (error) {
      return res.status(500).json({ error: 'Erro ao verificar pagamento' });
    }
  }

  return res.status(400).json({ error: 'Ação inválida' });
}