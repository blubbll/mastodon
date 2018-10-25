const//imports
fetch = require('node-fetch'),
smc = require('safe-memory-cache')({
    limit: 512
})

/** Mastodon has an API endpoint for instance, which returns all activated users,
 but no count of all users (unconfirmed as well), so i had to implement this myself*/
setTimeout(() => {
    let reportedCount = 0;
    let checkLatestId = () => {
        fetch(`${host}/api/v1/instance`).then(res => {
            res.json().then(data => {
                reportedCount = data.stats.user_count;
                smc.set("fakeTotal", reportedCount);
            });
        });
    };

    checkLatestId(), setInterval(checkLatestId, 1000 * 60 * 5); //every 5 mins

    const userCounter = (function() {
        var that = arguments.callee;
        const cFile = path.resolve(
            __dirname,
            `${host.split("://")[1].split(".").join("_")}.usercount`
        );

        const check = count => {
            var that = arguments.callee;

            console.log(
                `\nProcessing ${count} of ${reportedCount} (reported by API)`
            );

            const next = (skip) => {
                if (!skip) {
                    count = JSON.parse(count) + 1; //try to fetch latest (1 more than latest written down)
                    smc.set("count", count);
                }
                setTimeout(that, checkInterval * 1000);
            };

            fetch(`${host}/api/v1/accounts/${count}`).then(res => {
                smc.set("status", res.status);

                //we wuz slowed down
                if (res.status !== 429 && smc.get("intervalOriginal") !== undefined)
                    checkInterval = smc.get("intervalOriginal");
                //found
                if (res.status === 200 && smc.get("count") !== undefined) {
                    //if newer user found, write latest id to file
                    res.json().then(data => {
                        fs.writeFile(cFile, count, function(err) {
                            if (err) console.log(err);
                            smc.set("count", count);
                            //log to console
                            logger.info({
                                action: "updated usercount",
                                newValue: count
                            });
                            next();
                        });
                    });
                } //deleted or gone
                else if (
                    (res.status === 404 && reportedCount > count) ||
                    res.status === 410
                ) {
                    fs.writeFile(cFile, count, function(err) {
                        if (err) console.log(err);

                        //log to console
                        logger.info({
                            action: "skipped account (account is gone), updated usercount plus one",
                            newValue: count
                        });
                        next();
                    });
                } else if (res.status === 404) {
                    console.log("we're all set...");
                    next(true);
                } else if (res.status === 429) {
                    //slow down daddy
                    smc.set("intervalOriginal", checkInterval);
                    checkInterval = 20;
                    next();
                } else {
                
                  if(res.status === 200)
                    console.log("We've begun!");
                    else console.log("something bad happened :(" + res.status);
                    next();
                }
            
            });
        };
        //file exists, use it.
        if (fs.existsSync(cFile)) {
            //try to read memory cached var, use filereader ifvar is empty
            if (smc.get("count") === undefined)
                fs.readFile(cFile, "UTF-8", function(err, count) {
                    check(count);
                });
            else check(smc.get("count"));
        } else {
            //use fake count for initial count
            fetch(`${host}/api/v1/instance`).then(res => {
                res.json().then(data => {
                    reportedCount = data.stats.user_count;
                    fs.writeFileSync(cFile, reportedCount); //create file if not exist
                    that();
                });
            });
        }
    })();
});
