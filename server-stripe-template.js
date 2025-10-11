require('dotenv').config();
const express = require('express');
const Stripe = require('stripe');
const cors = require('cors');

const app = express();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

app.use(cors());
app.use(express.json());

// Ruta para crear el pago
app.post('/create-payment-intent', async (req, res) => {
  try {
    const { amount } = req.body; // El monto lo envía Flask en centavos

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'mxn',
    });

    res.send({
      clientSecret: paymentIntent.client_secret,
    });
  } catch (err) {
    console.error('Error creating payment intent:', err);
    res.status(500).json({ error: err.message });
  }
});

// Ruta de prueba
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Microservicio Stripe funcionando' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor Stripe escuchando en el puerto ${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/health`);
});
