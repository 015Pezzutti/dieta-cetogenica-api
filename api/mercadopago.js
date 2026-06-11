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
          external_reference: userId,
          notification_url: `${req.headers.origin}/api/mercadopago-webhook`
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
}