const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => {
      if(msg.type() === 'error') {
          console.log('BROWSER ERROR:', msg.text());
      } else {
          console.log('BROWSER LOG:', msg.text());
      }
  });
  page.on('pageerror', err => console.log('BROWSER PAGE ERROR:', err.message));
  
  await page.goto('http://localhost:5173');
  await new Promise(r => setTimeout(r, 2000));
  
  const tabs = await page.$$('button');
  for (const t of tabs) {
      const text = await page.evaluate(el => el.textContent, t);
      if (text && text.includes('Favorites')) {
          await t.click();
          await new Promise(r => setTimeout(r, 1000));
          break;
      }
  }
  
  const els = await page.$$('button[title="Edit Song"]');
  if (els.length > 0) {
      console.log('Clicking edit song');
      await els[0].click();
      await new Promise(r => setTimeout(r, 3000));
      const html = await page.content();
      console.log('Page body length after click:', html.length);
  } else {
      console.log('No edit song buttons found');
  }
  
  await browser.close();
})();
