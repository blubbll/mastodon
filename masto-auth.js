//Login route
app.post('/m-login', urlencodedParser, function(req, res) {
    var email = req.body.email;
    var password = req.body.password;
    var twoFa = req.body.twofa;
    //normal login check
    let checkLogin = (html) => {
        const $ = cheerio.load(html);
        //get token
        var msg = $(".alert.flash-message").text();
        //script with data there? great.
        let success = $("script")[2].children[0] !== undefined;
        if (success) {
            let json = JSON.parse($("script")[2].children[0].data);
            //compose.me is user id

            logger.info(`$id: ${json.compose.me} just logged into the system.`);

            res.status(200).json(json.compose.me);
            return true;
        } else if (msg !== "") {
            res.status(500).json(msg);
            return false;
        } else if (twoFa === '') {
            res.status(500).json({twofa: true, msg: $(".hint").text()});
            return false;
        }
    }
    //2fa check
    let checkLoginTwo = (html) => {
        const $ = cheerio.load(html);
        //get token
        var msg = $(".alert.flash-message").text();
        let success = $("script")[2].children[0] !== undefined;
        if (success) {
            let json = JSON.parse($("script")[2].children[0].data);
            logger.info(`$id: ${json.compose.me} just logged into the system (via 2fa).`);
            res.json(json.compose.me);
            return true;
        } else if (msg !== "") {
            res.json(msg);
            return false;
        }
    }
    //create browser for headless requests
    const browser = new Browser(zombieOptions); //https://stackoverflow.com/a/12105401
   if(req.headers['accept-language']!==undefined)browser.headers['accept-language']=req.headers['accept-language'];
    browser.visit(host+'/auth/sign_in', function() {
        //fill data
        browser.fill('input#user_email', email);
        browser.fill('input#user_password', password);
        //submit form
        browser.document.forms[0].submit();
        // warte auf neue Seite
        browser.wait().then(function() {
            // login checken
            if (checkLogin(browser.document.documentElement.innerHTML)) {
                //end serverside session
                browser.clickLink("[data-method=delete]", function(err, browser, status) {
                    logger.info(`ended auth session for ${email}`);
                });
            }
            //if 2fa enabled
            else if ((browser.document.documentElement.innerHTML).includes('id="user_otp_attempt"')) {
                browser.fill('input#user_otp_attempt', twoFa);
                browser.document.forms[0].submit();
                browser.wait().then(function() {
                    if (checkLoginTwo(browser.document.documentElement.innerHTML)) {
                        //end serverside session
                        browser.clickLink("[data-method=delete]", function(err, browser, status) {
                            logger.info(`ended auth session for ${email}`);
                        });
                    }
                });
            }
        })
    })
});
//Signup route
app.post('/m-register', urlencodedParser, function(req, res) {
    var email = req.body.email;
    var password = req.body.password;
    //normal login check
    let checkLogin = (html) => {
        const $ = cheerio.load(html);
        //get token
        var msg = $(".error").text();
        let success = $("#new_user")[0] !== undefined && $("#error_explanation").text() === '';
        if (success) {
            res.status(200).json($(".flash-message.notice").text());
            return true;
        } else if (msg !== "") {
            let issues = '';
            $(".error").each(function(i, elem) {
                issues += '<br/>'+`
                &bullet;&nbsp;&thinsp;<span class="property">${$(this).prev().attr('aria-label')}</span>:&nbsp;
                <span class="reason">${$(this).text()}</span>`;
            });
            if (issues.length > 0)
                res.status(400).send(issues.substring(5).minify());
            else res.status(500).json($(".flash-message.notice").text());

            return false;
        }
    }
    const browser = new Browser(zombieOptions); //https://stackoverflow.com/a/12105401
    if(req.headers['accept-language']!==undefined)browser.headers['accept-language']=req.headers['accept-language'];
  
  
    browser.visit(host+"/auth/sign_up", function() {
        //fill data
        browser.fill('input#user_account_attributes_username', smc.get("count")+1);
        browser.fill('input#user_email', email);
        browser.fill('input#user_password', password);
        browser.fill('input#user_password_confirmation', password);
        //submit form
        browser.document.forms[0].submit();
        // warte auf neue Seite
        browser.wait().then(function() {
                    
            // login checken
            if (checkLogin(browser.document.documentElement.innerHTML)) {
                //end serverside session
                logger.info(`${email} registered in the system.`);
            }
        })
    })
});
//Resend route
app.post('/m-resend', urlencodedParser, function(req, res) {
    var email = req.body.email;
    const browser = new Browser(zombieOptions); //https://stackoverflow.com/a/12105401
  
   if(req.headers['accept-language']!==undefined)browser.headers['accept-language']=req.headers['accept-language'];
    browser.visit(`${host}/auth/password/new`, function() {
      
        //fill data
        browser.fill('input#user_email', email);
        //submit form
        browser.document.forms[0].submit();
        // warte auf neue Seite
        browser.wait().then(function() {
          const $ = cheerio.load(browser.document.documentElement.innerHTML);
            res.status(200).json($(".flash-message.notice").text());
        })
    })
});
//Reset route
app.post('/m-reset', urlencodedParser, function(req, res) {
     var email = req.body.email;
    const browser = new Browser(zombieOptions); //https://stackoverflow.com/a/12105401
  
   if(req.headers['accept-language']!==undefined)browser.headers['accept-language']=req.headers['accept-language'];
    browser.visit(`${host}/auth/password/new`, function() {
      
        //fill data
        browser.fill('input#user_email', email);
        //submit form
        browser.document.forms[0].submit();
        // warte auf neue Seite
        browser.wait().then(function() {
          const $ = cheerio.load(browser.document.documentElement.innerHTML);
            res.status(200).json($(".flash-message.notice").text());
        })
    })
});
