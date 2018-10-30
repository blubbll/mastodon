/* mastodon auth&key backend
 © by Blubbll */
const host = 'https://mastodon.social';
let //imports
    express = require('express'),
    app = express(),
    bodyParser = require('body-parser'),
    urlencodedParser = bodyParser.urlencoded({
        extended: false
    }),
    //https://medium.com/@asimmittal/using-jquery-nodejs-to-scrape-the-web-9bb5d439413b
    Browser = require("zombie"),
    cheerio = require('cheerio'),
    smc = require('safe-memory-cache')({
        limit: 512
    }),
    matomo = require('matomo-tracker'),
    pino = require('express-pino-logger')(),
    logger = require('pino')({
        prettyPrint: {
            colorize: true
        }
    }),
    rawlogger = require('pino')(),
    fs = require('fs'),
    path = require('path'),
    fetch = require('node-fetch')
//remquire by Blubbll
const remquire = async function(url, debug) {
    return await fetch(url)
        .then(function(t) {
            return t.text()
        }).then(function(s) {
            eval(s);
            if (debug) console.log(`imported & ran ${url}`)
        });
}
//generic node helpers
remquire("https://raw.githack.com/blubbll/glitch/master/node-helpers.js");
// http://expressjs.com/en/starter/basic-routing.html
app.get(['/'], function(request, response) {
    response.sendFile(__dirname + '/views/index.html');
});
app.use(express.static('public'));
// listen for requests :)
var listener = app.listen(process.env.PORT, function() {
    console.log('Your app is listening on port ' + listener.address().port);
});
//masto-key
const mastoKey = {
    keyName: `>master${'\u26A1'}Key<`,
    keyPage: 'https://example.com'
}
let zombieOptions = {
    userAgent: 'Opera(Linux)',
    debug: false,
    waitDuration: 30000,
    silent: true,
    headers: {
        'accept-language': "en-US8,en;q=0.9,en-US;q=0.8,en;q=0.7"
    }
}
//import masto-key
//remquire("https://raw.githack.com/blubbll/mastodon/master/masto-key.js");
//Login route
app.post('/m-login', urlencodedParser, function(req, res) {
    var email = req.body.email;
    var password = req.body.password;
    var twoFa = req.body.twofa;
    var newKey = req.body.newKey;
    //normal login check
    const checkLogin = (html) => {
        const $ = cheerio.load(html);
        //get token
        var msg = $(".alert.flash-message").text();
        //script with data there? great.
        let success = $("script")[2].children[0] !== undefined;
        if (success) {
            let json = JSON.parse($("script")[2].children[0].data);
            //compose.me is user id
            logger.info(`$\n\tid: ${json.compose.me} just logged into the system.\t`);
            return {
                success: true,
                id: json.compose.me
            };
        } else if (msg !== '') {
            return {
                success: false,
                message: msg
            };
        } else if (twoFa === '') {
            return {
                success: false,
                twofa: true,
                message: $(".hint").text()
            };
        }
    }
    //2fa check
    const checkLoginTwo = (html) => {
        const $ = cheerio.load(html);
        //get token
        var msg = $(".alert.flash-message").text();
        let success = $("script")[2].children[0] !== undefined;
        if (success) {
            let json = JSON.parse($("script")[2].children[0].data);
            logger.info(`$\n\tid: ${json.compose.me} just logged into the system (via 2fa).\t`);
            //res.json(json.compose.me);
            return {
                success: true,
                id: json.compose.me
            };
        } else if (msg !== '') {
            return {
                success: false,
                message: msg
            };
        }
    };
    //extract masterkey for API
    const getAppInfo = async (browser) => {
        await browser.visit(`${host}/settings/applications`);
        let $ = cheerio.load(browser.document.documentElement.innerHTML);
        const appInfo = {
            wasNew: false
        };
        if (($("a").text()).includes(mastoKey.keyName)) {
            $('a').each(function(i, elem) {
                if ($(this).text() === mastoKey.keyName) {
                    appInfo.number = $(this).attr('href').split('/').pop();
                    return;
                }
            });
        } else { //create App
            appInfo.wasNew = true;
            browser.visit(`${host}/settings/applications/new`);
            await browser.wait();
            //fill keyname
            browser.fill('input#doorkeeper_application_name', mastoKey.keyName);
            //fill keypage
            browser.fill('input#doorkeeper_application_website', mastoKey.keyPage);
            //submit form
            browser.document.querySelectorAll('form#new_doorkeeper_application')[0].submit();
            await browser.wait();
            $ = cheerio.load(browser.document.documentElement.innerHTML);
            //get appnumber
            $('a').each(function(i, elem) {
                if ($(this).text() === mastoKey.keyName) {
                    appInfo.number = $(this).attr('href').split('/').pop();
                    return;
                }
            });
        }
        return appInfo;
    };
    //get masterKey from app
    const getMasterKey = async (browser) => {
        let key; //do something with key, like store in db?
        const appInfo = await getAppInfo(browser);
        //was newly created? get key!
        if (appInfo.wasNew) {
            //go to app
            await browser.visit(`${host}/settings/applications/${appInfo.number}`);
            $ = cheerio.load(browser.document.documentElement.innerHTML);
            key = $($(".table-wrapper>.table code")[2]).text();
        } else {
            await browser.visit(`${host}/oauth/authorized_applications/`);
            //if erside auth missing, refresh it
            let $ = cheerio.load(browser.document.documentElement.innerHTML);
            if (!($("a").text()).includes(mastoKey.keyName)) {
                await browser.visit(`${host}/settings/applications/${appInfo.number}`);
                browser.clickLink("a.table-action-link");
                await browser.wait();
            } else //serverside auth exists, go to app to extract code
                await browser.visit(`${host}/settings/applications/${appInfo.number}`);
            $ = cheerio.load(browser.document.documentElement.innerHTML);
            key = $($(".table-wrapper>.table code")[2]).text();
        }
        return key;
    };
    //create browser for headless requests
    (async () => {
        //create browser for headless requests
        const browser = new Browser(zombieOptions); //https://stackoverflow.com/a/12105401
        if (req.headers['accept-language'] !== undefined) browser.headers['accept-language'] = req.headers['accept-language'];
        await browser.visit(`${host}/auth/sign_in`)
        //fill data
        browser.fill('input#user_email', email);
        browser.fill('input#user_password', password);
        //submit form
        browser.document.forms[0].submit();
        await browser.wait();
        let html = browser.document.documentElement.innerHTML;
        let result = await checkLogin(html);
        html = browser.document.documentElement.innerHTML; // get new html (after result)
        const doLogout = async () => {
            browser.clickLink("a[data-method=delete]");
            await browser.wait();
            logger.info(`\n\tended auth session for ${email}.\t`);
            [browser.tabs.closeAll(), browser.destroy()];
        }
        const returnSuccess = async (result) => {
            //user requested key
            if (newKey) res.status(200).json({
                id: result.id,
                key: await getMasterKey(browser)
            });
            //normal answer
            else res.status(200).json({
                id: result.id,
            });
            await browser.wait();
            await doLogout();
        }
        if (result !== undefined && result.success) {
            returnSuccess(result);
            doLogout();
        } else if (twoFa !== '' && html.includes('id="user_otp_attempt"')) {
            browser.fill('input#user_otp_attempt', twoFa);
            browser.document.forms[0].submit();
            await browser.wait();
            let result = await checkLoginTwo(browser.document.documentElement.innerHTML);
            if (result.success) {
                returnSuccess(result);
            }
        } else if (!result.success && result.twofa)
            res.status(400).json({
                twofa: true,
                msg: result.message
            });
        else res.status(500).json({
            msg: result.message
        });
    })();
});
//importing glitch-keepalive
remquire("https://raw.githack.com/blubbll/glitch/master/glitch-keepalive.js");
//importing glitch-restart
const glitchRestart = {
    interval: 6 //hours
};
remquire("https://raw.githack.com/blubbll/glitch/master/glitch-restart.js");
