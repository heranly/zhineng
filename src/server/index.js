const Koa = require('koa');
const Router = require('koa-router');
const koaBetterBody = require('koa-better-body');
const browserStack = require('./browserStack.js');
const extractStructure = require('../core/structure.js');

const app = new Koa();
const router = new Router();

const checkuid = (ctx, next) => {
    if (ctx.query.uid) {
        const uid = ctx.query.uid;
        if (browserStack.has(uid)) {
            return next();
        } else {
            ctx.body = JSON.stringify({
                code: 404,
                message: `${ctx.query.uid} browser not found `,
            });
        }
    } else {
        ctx.body = JSON.stringify({
            code: 404,
            message: `uid not defined!`,
        });
    }
};

const checkNewWindow = async (ctx, next) => {
    const uid = ctx.query.uid;
    const {
        driver,
    } = browserStack.get(uid);
    const before = await driver.getAllWindowHandles();
    const numBefore = before.length;
    const result = await next();
    const after = await driver.getAllWindowHandles();
    const numAfter = after.length;
    if (numAfter !== numBefore) {
        result.newWindow = after[after.length - 1];
    }
    ctx.response.body = JSON.stringify(result);
};

function isUrl(url) {
    return /https?:\/\//.test(url);
}

router.get('/', (ctx, next) => {
    ctx.response.type = 'html/text';
    ctx.response.body = '<html><title>introduction</title><body></body></html>';
});

router.get('/openbrowser', async (ctx) => {
    const nohead = ctx.query.nohead;
    const uid = await browserStack.openBrowserPage(nohead);
    const handles = await browserStack.get(uid).driver.getAllWindowHandles();
    ctx.response.type = 'application/json; charset=utf-8';
    ctx.body = JSON.stringify({
        code: 200,
        uid,
        newWindow: handles[0],
    });
});

router.get('/extractstructure', checkuid, async (ctx) => {
    const uid = ctx.query.uid;
    const url = ctx.query.url;
    let tags = ctx.query.tags;
    if(tags) {
        tags = tags.split(',');
    }
    const browserpage = browserStack.get(uid);
    if (url && isUrl(url)) {
        await browserpage.driver.get(url);
    }
    const {
        tree: structure, 
    } = await extractStructure(browserpage.driver, tags);
    ctx.response.type = 'application/xml; charset=utf-8';
    ctx.response.body = `<?xml version="1.0" encoding="UTF-8"?>${structure.toSlimXML(2)}`;
});

router.get('/extractstructurejson', checkuid, async (ctx) => {
    const uid = ctx.query.uid;
    const url = ctx.query.url;
    const browserpage = browserStack.get(uid);
    let tags = ctx.query.tags;
    if(tags) {
        tags = tags.split(',');
    }
    if (url && isUrl(url)) {
        await browserpage.driver.get(url);
    }
    const {
        tree: structure,
        meta,    
    } = await extractStructure(browserpage.driver, tags, true);
    ctx.response.type = 'application/json; charset=utf-8';
    ctx.response.body = JSON.stringify(({
        meta,
        tree: structure.toJSONOBJ()
    }));
});

router.get('/closebrowser', checkuid, async (ctx) => {
    const uid = ctx.query.uid;
    const browserpage = browserStack.get(uid);
    await browserpage.browser.close();
    browserStack.delete(uid);
    ctx.response.body = JSON.stringify({
        code: 200,
        message: `${ctx.query.uid} browser is closed `,
    });
});

// router.get('/depthgraph', async (ctx) => {
//     const uid = ctx.query.uid;
//     const browserpage = browserStack.get(uid);
//     const 
// });
router.get('/photograph', checkuid, async (ctx) => {
    const uid = ctx.query.uid;
    const browserpage = browserStack.get(uid);
    const base64Image = await browserpage.driver.takeScreenshot();
    const imagebuffer = new Buffer(base64Image, 'base64');
    ctx.response.type = 'image/png';
    ctx.response.body = imagebuffer;
});



app.use(koaBetterBody());
app.use(router.routes());
app.use(router.allowedMethods());

app.listen(8088);
// require('./src/selecnium/index');
