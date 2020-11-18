const puppeteer = require('puppeteer'); 
const url = "https://www.toutiao.com/a6887424389080416780/";
async function run() {     
    let browser = await puppeteer.launch({ headless: true });
    let page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle0", timeout: 60000 });
    await page.setViewport({ width: 1400, height: 800 });
    await page.screenshot({
        path: "./screenshot.jpg",
        type: "jpeg",
        fullPage: true
    });
    await page.close();
    await browser.close();
} 
run();