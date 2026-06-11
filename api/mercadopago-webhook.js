// api/mercadopago-webhook.js
const mercadopago = require('mercadopago');
const admin = require('firebase-admin');

// Inicializa Firebase Admin (se for usar Firestore)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault()
    // Ou use a configuração manual com service account
  });
}

const MP_ACCESS_TOKEN = 'APP_USR-2472261822250012-060912-d90e0b4de55e46cfd3787c34e37658f2-256186484';
mercadopago.configure({ access_token: MP_ACCESS_TOKEN });

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { type, data } = req.body;

  console.log('Webhook recebido:', type);

  if (type === 'payment') {
    try {
      const payment = await mercadopago.payment.findById(data.id);

      if (payment.body.status === 'approved') {
        const userId = payment.body.external_reference;
        
        // Aqui você ativa a assinatura no seu banco de dados
        if (userId) {
          // Exemplo com Firestore:
          // const db = admin.firestore();
          // await db.collection('users').doc(userId).update({
          //   subscriptionPlan: payment.body.description.includes('Pro') ? 'pro' : 'premium',
          //   subscriptionStatus: 'active',
          //   subscriptionActivatedAt: new Date().toISOString()
          // });
          
          console.log(`✅ Assinatura ativada para: ${userId}`);
        }
      }
    } catch (error) {
      console.error('Erro webhook:', error);
    }
  }

  res.status(200).json({ received: true });
};