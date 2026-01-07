const express = require('express');
const cors = require('cors');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');

const app = express();
const PORT = process.env.PORT || 10000;

// CORS - Permite requisições de qualquer origem
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

let qrCodeData = null;
let isReady = false;

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
      '--disable-gpu'
    ]
  }
});

client.on('qr', async (qr) => {
  console.log('QR Code recebido');
  qrCodeData = await qrcode.toDataURL(qr);
});

client.on('ready', () => {
  console.log('WhatsApp conectado!');
  isReady = true;
  qrCodeData = null;
});

client.on('disconnected', () => {
  console.log('WhatsApp desconectado');
  isReady = false;
});

client.initialize();

// Endpoints
app.get('/', (req, res) => {
  res.json({ 
    status: isReady ? 'conectado' : 'aguardando', 
    qr: !!qrCodeData 
  });
});

app.get('/qr', (req, res) => {
  if (isReady) {
    return res.json({ ready: true, qr: null });
  }
  res.json({ ready: false, qr: qrCodeData });
});

app.get('/status', (req, res) => {
  res.json({ connected: isReady });
});

app.post('/send', async (req, res) => {
  const { phone, message } = req.body;
  
  if (!isReady) {
    return res.json({ success: false, error: 'WhatsApp não conectado' });
  }
  
  try {
    const chatId = phone.includes('@c.us') ? phone : `${phone}@c.us`;
    await client.sendMessage(chatId, message);
    res.json({ success: true });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
