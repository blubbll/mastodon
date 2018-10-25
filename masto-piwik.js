app.get(mastoPiwik.routes, function(req, res) {
    //gather important data
    var _ip = req.headers['x-forwarded-for'].split(',')[0].replace('::ffff:', "");
    var _url = req.headers['referer'];
    //define actual logging method
    let doLog = geoip => {
        _ip = req.headers['x-forwarded-for'].split(',')[0].replace('::ffff:', "");
        _url = req.headers['referer'];
        var m = new matomo(mastoPiwik.site, mastoPiwik.url);
        m.track({
            token_auth: process.env.MATOMO_TOKEN,
            cip: _ip,
            url: _url,
            ua: req.get('user-agent'),
            action_name: `${_url}(from Mastodonlog)`,
            ua: `${req.get('User-Agent')}`,
            cvar: JSON.stringify({
                '1': ['from_log', true]
            })
        });
        logger.info({
            country: geoip.country,
            secure: req.headers.secure === 'true',
            host: _url.split("//")[1].split("/")[0],
            path: _url.split("//")[1].replace(_url.split("//")[1].split("/")[0], ''),
            ip: _ip
        });
    }
    //cache ip for less requests to geoip tool
    if (smc.get(`geo_${_ip}`) === undefined)
        fetch(`http://ip-api.com/json/${_ip}`)
        .then(function(response) {
            return response.json();
        })
        .then(function(data) {
            smc.set(`geo_${_ip}`, data);
            doLog(data);
        });
    else doLog(smc.get(`geo_${_ip}`));
    res.status(200).json("?Blubbll's Mastodon Tracker\u2122? - don't worry, we respect your privacy. Use the contact form if you wanna know more about why we track this request.");
});
