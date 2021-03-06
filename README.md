# custom nodejs mastodon-scripts

Hey, here are a few node.js snippets i use for mastodon:

**This is intended for disconnected, private mastodon instances only and should be replaced by actual oAuth2 calls in public production applications** (this is especially for masto-auth and masto-key):
https://gist.github.com/aparrish/661fca5ce7b4882a8c6823db12d42d26

- (deprecated) masto-count is a simple script that counts the actual registered (and unconfirmed too) accounts on a mastodon instance.
Best to be used with disconnected instances as they don't have any id holes.
Requires config-object mastoCount{} with mastoCount.host and mastoCount.interval

- masto-auth is a complete mitm authentification suite to be used in other apps or web apps.
it currently has the support for account registrations on mastodon instances, login, resend confirm and reset password.
in it's current form it's thought to be used with disconnected masto.host instances (no relays).

- masto-piwik is a simple piwik tracking solution for masto.host instances when you can only implement tracking via css
config: const mastoPiwik = {
  routes: ['/donut'], //add this url using an @import url ('%nodehost%'/route)
  url: '%url%', //piwik url
  site: 4 //piwik site id
}

- masto-twit is a script that helps building a bot that mirrors mastodon posts to twitter. currently working on it

- masto-key: A mitm script that gives you a key to control all user actions via the api. may need to contact your users about if, should only be used on (disconnected/) private instances. This is intended for disconnected, private mastodon instances only and should be replaced by actual oAuth2 calls in public production applications
