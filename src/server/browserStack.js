const { Builder } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
let uid = 0;
function genUid(uid) {
    return `saweb${uid}`;
}

class BrowserStack extends Map {
    async openBrowserPage(nohead) {
        const options = new chrome.Options().windowSize({
            width: 1900,
            height: 800,
        });
        if(nohead){
            options.headless();
        }
        const driver = await new Builder()
            .forBrowser('chrome')
            .setChromeOptions(options)
            .build();
        uid++;
        this.set(genUid(uid), {
            uid,
            driver,
        });

        return genUid(uid);
    }
}
module.exports = new BrowserStack();
