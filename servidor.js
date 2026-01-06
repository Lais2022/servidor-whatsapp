const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

let qrCodeData = null;
let isReady = false;
let client = null;

function initClient() {
  client = new Client({
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
        '--disable-gpu'
      ]
    }
  });

  client.on('qr', async (qr) => {
    console.log('QR Code recebido');
    qrCodeData = await qrcode.toDataURL(qr);
    isReady = false;
  });

  client.on('ready', () => {
    console.log('WhatsApp conectado!');
    isReady = true;
    qrCodeData = null;
  });

  client.on('message', async (msg) => {
    console.log('Mensagem recebida:', msg.body);
    // Aqui vao as automacoes
    const resposta = getAutoResponse(msg.body);
    if (resposta) {
      await msg.reply(resposta);
    }
  });

  client.on('disconnected', () => {
    console.log('WhatsApp desconectado');
    isReady = false;
    qrCodeData = null;
  });

  client.initialize();
}

function getAutoResponse(message) {
  const lower = message.toLowerCase();
  
  if (lower.includes('oi') || lower.includes('ola') || lower.includes('bom dia') || lower.includes('boa tarde') || lower.includes('boa noite')) {
    return 'Ola! Bem-vindo! Como posso ajudar voce hoje?';
  }
  if (lower.includes('preco') || lower.includes('valor') || lower.includes('quanto')) {
    return 'Nossos precos variam de acordo com o produto. Qual item voce tem interesse?';
  }
  if (lower.includes('horario') || lower.includes('funcionamento') || lower.includes('aberto')) {
    return 'Funcionamos de segunda a sexta, das 9h as 18h. Sabados das 9h as 13h.';
  }
  if (lower.includes('endereco') || lower.includes('localizacao') || lower.includes('onde fica')) {
    return 'Estamos localizados na Av. Principal, 1234 - Centro.';
  }
  if (lower.includes('obrigado') || lower.includes('obrigada') || lower.includes('valeu')) {
    return 'Por nada! Estou sempre a disposicao. Tenha um otimo dia!';
  }
  if (lower.includes('pix') || lower.includes('pagamento') || lower.includes('pagar')) {
    return 'Aceitamos PIX, cartao de credito e debito. Qual forma prefere?';
  }
  
  return 'Recebi sua mensagem! Um atendente respondera em breve.';
}

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

app.get('/qr', (req, res) => {
  if (isReady) {
    res.json({ connected: true, message: 'Ja conectado!' });
  } else if (qrCodeData) {
    res.json({ connected: false, qrCode: qrCodeData });
  } else {
    res.json({ connected: false, message: 'Aguardando QR Code...' });
  }
});

app.get('/status', (req, res) => {
  res.json({ connected: isReady, hasQR: !!qrCodeData });
});

app.post('/send', async (req, res) => {
  if (!isReady) {
    return res.status(400).json({ error: 'WhatsApp nao conectado' });
  }
  const { phone, message } = req.body;
  try {
    const chatId = phone.includes('@c.us') ? phone : phone + '@c.us';
    await client.sendMessage(chatId, message);
    res.json({ success: true, message: 'Mensagem enviada!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/disconnect', (req, res) => {
  if (client) {
    client.destroy();
    isReady = false;
    qrCodeData = null;
  }
  res.json({ success: true });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log('Servidor rodando na porta ' + PORT);
  initClient();
});
