[setTimeout(() => {
    const toots = new db.table('toots');

    //ran after toot has been mirrored to twitter
    const continueFrom = toot => {
      toots.set('lastToot', toot);//store last tootId in table
      toots.set(toot.id, toot);//store complete entry in table
      smc.set('lastToot', toot);//store in memory
      logger.info(`\n\tProcessed ${toot.id}\t`);//output
      setTimeout(check, mastoTwit.interval * (1000));//lets a go, check out the next one!
    };
  
    const check = function() {
        var that = arguments.callee;

        fetch(`${mastoTwit.host}/api/v1/accounts/${mastoTwit.account}/statuses?limit=1&access_token=${process.env.MASTODON_ACCESSTOKEN}`).then(res => {

            if (res.status === 200)
                res.json().then(data => { const toot = data[0];

                                         
                    //did we process the toot successfully yet?
                    if (toot !== toots.get('lastToot') && toot.visibility === 'public') {

                        //user has toots
                        if (data.length >>> 0) {
                          
                          logger.info(`\n\tProcessing toot#${toot.id}...\t`);
                          
                            

                          //Toot has media
                          if(toot.media_attachments.length >>> 0)
                          {
                           
                            continueFrom(toot);
                            
                          }
                          
                          //normal toot (not much other choices yet)
                          else {
                            
                            T.post('statuses/update', { status: 'hello world!' }, function(err, data, response) {
                              continueFrom(toot);
                            })
                            
                          }
                          
                          
                          
                        } else setTimeout(that);
                    }
                })
        });


    }();
})];
