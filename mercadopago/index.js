// functions/index.js
const admin = require('firebase-admin');
const functions = require('firebase-functions');
const mercadopago = require('mercadopago');

if (!admin.apps.length) {
  admin.initializeApp();
}

// ✅ NOVA CREDENCIAL
const MP_ACCESS_TOKEN = 'APP_USR-2472261822250012-061108-946d853d79aee4085db53cc91d239891-256186484';

mercadopago.configure({
  access_token: MP_ACCESS_TOKEN
});

exports.createPixPayment = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Login necessário');
  }

  const { planId } = data;
  
  // ✅ CORREÇÃO: Usar 'plus' em vez de 'pro'
  const plans = {
    premium: { value: 29.90, name: 'Plano Premium Vitalício' },
    plus: { value: 49.90, name: 'Plano Plus Vitalício' }
  };

  const plan = plans[planId];
  if (!plan) {
    throw new functions.https.HttpsError('invalid-argument', `Plano inválido: ${planId}`);
  }

  try {
    const payment = await mercadopago.payment.create({
      transaction_amount: plan.value,
      description: plan.name,
      payment_method_id: 'pix',
      payer: { email: context.auth.token.email || 'cliente@email.com' },
      external_reference: context.auth.uid
    });

    await admin.firestore().collection('transactions').doc(payment.body.id.toString()).set({
      userId: context.auth.uid,
      planId: planId,
      amount: plan.value,
      status: 'PENDING',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return {
      success: true,
      qrCode: payment.body.point_of_interaction.transaction_data.qr_code,
      qrCodeBase64: payment.body.point_of_interaction.transaction_data.qr_code_base64,
      paymentId: payment.body.id,
      pixCopyPaste: payment.body.point_of_interaction.transaction_data.qr_code
    };
  } catch (error) {
    console.error('Erro MP:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

exports.checkPaymentStatus = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Login necessário');
  }

  const { paymentId } = data;
  const payment = await mercadopago.payment.findById(paymentId);
  
  return {
    status: payment.body.status,
    confirmedDate: payment.body.date_approved,
    value: payment.body.transaction_amount
  };
});