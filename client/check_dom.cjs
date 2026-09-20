const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  await page.goto('http://localhost:5578/overview', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 2000));
  
  const content = await page.evaluate(() => {
    const el = document.querySelector('.max-w-\\[1600px\\]');
    return el ? el.innerHTML : 'NOT FOUND';
  });
  console.log("Dashboard Content:", content);
  
  await browser.close();
})();
