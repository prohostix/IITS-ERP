const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  page.on('console', msg => {
    if (msg.type() === 'error') console.error('BROWSER ERROR:', msg.text());
  });
  
  page.on('pageerror', err => {
    console.error('PAGE ERROR:', err.toString());
  });
  
  await page.goto('http://localhost:5578/', { waitUntil: 'networkidle0' });
  await page.type('#email', 'ops@pype.com');
  await page.type('#password', 'password123'); // assuming standard mock password
  await Promise.all([
    page.click('button[type="submit"]'),
    page.waitForNavigation({ waitUntil: 'networkidle0' })
  ]).catch(e => console.error("Nav failed", e));
  
  await new Promise(r => setTimeout(r, 2000));
  const html = await page.evaluate(() => document.body.innerHTML);
  console.log("HTML length:", html.length);
  if (html.length < 500) console.log("HTML content:", html);
  
  await browser.close();
})();
