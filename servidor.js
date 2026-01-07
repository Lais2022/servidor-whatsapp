const { Client, LocalAuth } = require('whatsapp-web.js');
const express = require('express');
const qrcode = require('qrcode');

const app = express();
const port = process.env.PORT || 3000;

let qrCodeData = null;
let clientReady = false;

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  }
});

client.on('qr', (qr) => {
  qrCodeData = qr;
  console.log('QR Code gerado');
});

client.on('ready', () => {
  clientReady = true;
  console.log('WhatsApp conectado!');
});

app.get('/', (req, res) => {
  res.json({ status: clientReady ? 'conectado' : 'aguardando', qr: !!qrCodeData });
});

app.get('/qr', async (req, res) => {
  if (clientReady) return res.send('Já conectado!');
  if (!qrCodeData) return res.send('Aguardando QR...');
  const qrImage = await qrcode.toDataURL(qrCodeData);
  res.send(`<img src="${qrImage}" />`);
});

client.initialize();
app.listen(port, () => console.log(`Servidor rodando na porta ${port}`));
