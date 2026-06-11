<<<<<<< HEAD
// api/mercadopago.js
export default async function handler(req, res) {
  const { action, planId, userId, userEmail, paymentId } = req.body;

  console.log('📥 Requisição recebida:', { action, planId, userId });

  // ✅ CORREÇÃO: Mapeamento correto dos planos (plus e premium)
  const plans = {
    premium: { value: 29.90, name: 'Plano Premium Vitalício' },
    plus: { value: 49.90, name: 'Plano Plus Vitalício' }
  };

  // ✅ SEU NOVO TOKEN
  const MP_ACCESS_TOKEN = 'APP_USR-2472261822250012-061108-946d853d79aee4085db53cc91d239891-256186484';
  const MP_API_URL = 'https://api.mercadopago.com/v1';

  if (action === 'create_pix') {
    const plan = plans[planId];
    
    if (!plan) {
      console.error('❌ Plano inválido:', planId);
      return res.status(400).json({ 
        error: `Plano inválido: "${planId}". Planos disponíveis: ${Object.keys(plans).join(', ')}` 
      });
    }

    console.log('✅ Criando PIX para:', plan.name, 'R$', plan.value);
=======
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
<<<<<<< HEAD
          external_reference: userId,
          notification_url: `${req.headers.origin}/api/mercadopago-webhook`
=======
          external_reference: userId
>>>>>>> 51d92525a1b573641347650603f6b1f73a14ebb2
        })
      });

      const payment = await response.json();

      if (!response.ok) {
<<<<<<< HEAD
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
=======
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
>>>>>>> 51d92525a1b573641347650603f6b1f73a14ebb2
    }
  }

  if (action === 'check_status') {
    try {
<<<<<<< HEAD
      console.log('🔍 Verificando status do pagamento:', paymentId);
      
=======
>>>>>>> 51d92525a1b573641347650603f6b1f73a14ebb2
      const response = await fetch(`${MP_API_URL}/payments/${paymentId}`, {
        headers: { 'Authorization': `Bearer ${MP_ACCESS_TOKEN}` }
      });
      const payment = await response.json();

<<<<<<< HEAD
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
=======
      return res.status(200).json({
        status: payment.status,
        confirmedDate: payment.date_approved
      });
    } catch (error) {
>>>>>>> 51d92525a1b573641347650603f6b1f73a14ebb2
      return res.status(500).json({ error: 'Erro ao verificar pagamento' });
    }
  }

  return res.status(400).json({ error: 'Ação inválida' });
}