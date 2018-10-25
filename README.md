# custom nodejs mastodon-scripts

- masto-count is a simple script that counts the actual registered (and unconfirmed too) accounts on a mastodon instance.
Best to be used with disconnected instances as they don't have any id holes.
Requires config-object mastoCount{} with mastoCount.host and mastoCount.interval

- masto-piwik is a simple piwik tracking solution for masto.host instances when you can only implement tracking via css
config: const mastoPiwik = {
  routes: ['/donut'], //add this url using an @import url ('%nodehost%'/route)
  url: 'https://stats.exxo.cloud/piwik.php', //piwik url
  site: 4 //piwik site id
}
