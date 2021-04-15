const msg = {}
const { client } = require('../../index.js')
const config = require('../config/config.json')
const color = require('../colors.js')
const wcaGuild = require('../guild.js')
const wcaCore = require('./core.js')
const wcaResourcePack = require('./resourcepack.js')
const universal = require('../universal.js')
const log = require('../logging.js')
const wcaBomb = require('../bomb.js')

msg.onMessage = function onMessage (message, messageString, messageMotd, messageAnsi) {
  universal.info.realIGN = undefined
  // COMMENT: Exclude spam has many messages that clutter up your chat such as level up messages and other stuff like that
  const excludeActionbar = /(?:.+ \d+\/\d+ {4}(?:.*) {4}. \d+\/\d+)/
  const excludeSpam = /(?:.+ \d+\/\d+ {4}(?:.*) {4}. \d+\/\d+|\[Info\] .+|As the sun rises, you feel a little bit safer...|\[\+\d+ Soul Points?\]|You still have \d+ unused skill points! Click with your compass to use them!)/
  if (!excludeActionbar.test(messageString)) {
    wcaCore.chatLog(message, messageString, excludeSpam)
    // COMMENT: I do not want to check for any messages from the actionbar
    if (messageString === 'Loading Resource Pack...') {
      wcaResourcePack.resourcePackAccept()
    } else {
      // COMMENT: Regex for messages in hub that do fire the login event.
      const compassCheckRegex = /(You're rejoining too quickly! Give us a moment to save your data\.|Already connecting to this server!)/
      // COMMENT: Regex for messages in hub that don't fire the login event.
      const compassCheckErrors = /(Could not connect to a default or fallback server, please try again later: io.netty.channel.ConnectTimeoutException|You are already connected to this server!|The server is full!|.* left the game.|<\w+> .*)/
      // COMMENT: Regex for server restarts.
      const serverRestartRegex = /(The server is restarting in (10|\d) (minute|second)s?\.|Server restarting!|The server you were previously on went down, you have been connected to a fallback server|Server closed)/
      // COMMENT: Regex for bombs.
      const bombThankRegex = /Want to thank (.+)\? Click here to thank them!/
      // COMMENT: Regex for joining a world.
      const worldJoinRegex = /§r§a(?:|§r§a§o)(\w+)§r§2 has logged into server §r§a(WC\d+)§r§2 as §r§a(?:a|an) (\w+)§r/
      if (compassCheckRegex.test(messageString)) {
        universal.state.compassCheck = true
        // wcacore.compass()
      } else if (compassCheckErrors.test(messageString)) {
        wcaCore.lobbyError('LobbyError')
      } else if (serverRestartRegex.test(messageString)) {
        // onKick('server_restart')
        wcaCore.hub('Server_Restart')
      } else if (bombThankRegex.test(messageString)) {
        // COMMENT: get off the server if an bomb is thrown - some people do item bomb parties
        universal.timer.hubTimer = setTimeout(() => {
          log.log(`going to hub because bomb was thrown on ${universal.info.currentWorld}`)
          wcaCore.hub('Bomb_Thanks')
        }, 2000)
      } else if (worldJoinRegex.test(messageMotd)) {
        const matches = worldJoinRegex.exec(messageMotd)
        if (matches[1] === universal.info.droidIGN || matches[1] === universal.info.droidNickedIGN) {
          const [, username, world, wynnclass] = matches
          wcaCore.onBotJoin(username, world, wynnclass)
          // logGuildJoinToDiscord(message, username, world, wynnclass)
        }
      } else if (config.guildTracker || config.shoutTracker || config.bombTracker) {
        if (config.guildTracker) {
          // COMMENT: Regex for guild message.
          const guildMessageRegex = /§r§3\[(?:|§r§b(★|★★|★★★|★★★★|★★★★★))§r§3(.*)\]§r§b (.*)§r/
          // COMMENT: Regex for guild members joining.
          const guildJoinRegex = /§r§b(.+)§r§3 has logged into server §r§b(\w+)§r§3 as §r§ba (\w+)§r/
          // COMMENT: Regex for guild bank.
          const guildBankRegex = /\[INFO\] (.+) (deposited|withdrew) (\d+x) (.+) (from|to) the Guild Bank \((.+)\)/
          // COMMENT: Regex for territory tracking.
          const territoryRegex = /\[WAR\] The war for (.+) will start in (\d+) (.+)\./
          if (guildMessageRegex.test(messageMotd)) {
            const matches = guildMessageRegex.exec(messageMotd)
            if (matches[2] === 'INFO') return
            let [fullMessage, guildRank, guildUsername, guildMessage] = matches
            if (universal.info.realIGN != null) guildUsername = universal.info.realIGN
            wcaGuild.guildMessage(fullMessage, guildRank, guildUsername, guildMessage)
          } else if (guildJoinRegex.test(messageMotd)) {
            const matches = guildJoinRegex.exec(messageMotd)
            if (matches[1] === universal.droid.username) return
            let [fullMessage, guildUsername, guildWorld, guildClass] = matches
            if (universal.info.realIGN != null) guildUsername = universal.info.realIGN
            wcaGuild.guildJoin(fullMessage, guildUsername, guildWorld, guildClass)
          } else if (guildBankRegex.test(messageString)) {
            const matches = guildBankRegex.exec(messageString)
            let [fullMessage, shoutUsername, deposit, amount, item, fromto, guildRank] = matches
            if (universal.info.realIGN != null) shoutUsername = universal.info.realIGN
            wcaGuild.guildBank(fullMessage, shoutUsername, deposit, amount, item, fromto, guildRank)
          } else if (territoryRegex.test(messageString)) {
            const matches = territoryRegex.exec(messageString)
            const [, territory, time, minutes] = matches
            if (minutes === 'minute' || minutes === 'seconds' || minutes === 'second') return
            wcaGuild.territory(territory, time)
          }
        }
        if (config.shoutTracker) {
          // COMMENT: Regex for shout messages
          const shoutMessageRegex = /(\w+) \[(WC\d+)\] shouts: (.+)/
          if (shoutMessageRegex.test(messageString)) {
            const matches = shoutMessageRegex.exec(messageString)
            const [fullMessage, username, world, shoutMessage] = matches
            msg.logShout(fullMessage, username, world, shoutMessage)
          }
        }
        if (config.bombTracker) {
          // COMMENT: Legacy regexes, motd is better because spoofing is impossible
          // const bombBellRegex = /\[Bomb Bell\] (.+) has thrown a (.+) Bomb on (WC\d+)/
          // const bombThrownRegex = /(\w+) has thrown a (.+) Bomb!.*/
          // const bombPMRegex = /\[(\w+) . (?:.+)\] (.+) on (WC\d+) /
          // const sanatizeMessage = /(\[.+\] .+: .*|\[.* . .*\] .*)/
          const bombBellRegex = /§r§e\[Bomb Bell\] §r§f(\w+) §r§7has thrown (?:a|an) §r§f(.+) Bomb §r§7on §r§f(\w+)§r/
          const bombBellNickedRegex = /§r§e\[Bomb Bell\] §r§f§r§f§r§f§o(.+)§r§f §r§7has thrown (?:a|an) §r§f(.+) Bomb §r§7on §r§f(\w+)§r/
          const bombThrownRegex = /§r§b(\w+)§r§3 has thrown (?:a|an) §r§b(.+)§r§3!.*/
          const bombThrownNickedRegex = /§r§b§r§b§o(.+)§r§3 has thrown (?:a|an) §r§b(.+)§r§3!.*/
          if (bombBellNickedRegex.test(messageMotd)) {
            const matches = bombBellNickedRegex.exec(messageMotd)
            let [fullMessage, username, bomb, world] = matches
            // COMMENT: Use their real username if they are a Champion nick
            if (universal.info.realIGN != null) username = universal.info.realIGN
            wcaBomb.logBomb(fullMessage, username, bomb, world)
          } else if (bombBellRegex.test(messageMotd)) {
            const matches = bombBellNickedRegex.exec(messageMotd)
            const [fullMessage, username, bomb, world] = matches
            wcaBomb.logBomb(fullMessage, username, bomb, world)
          } else if (bombThrownNickedRegex.test(messageMotd)) {
            const matches = bombThrownNickedRegex.exec(messageMotd)
            let [fullMessage, username, bomb] = matches
            if (universal.info.realIGN != null) username = universal.info.realIGN
            clearTimeout(universal.timer.hubTimer) // COMMENT: remove the timer if it is reported here
            log.log(`going to hub because bomb was thrown on ${universal.info.currentWorld}`)
            wcaBomb.logBomb(fullMessage, username, bomb, universal.info.currentWorld)
            wcaCore.hub('Bomb')
          } else if (bombThrownRegex.test(messageMotd)) {
            const matches = bombThrownRegex.exec(messageMotd)
            const [fullMessage, username, bomb] = matches
            clearTimeout(universal.timer.hubTimer) // COMMENT: remove the timer if it is reported here
            log.log(`going to hub because bomb was thrown on ${universal.info.currentWorld}`)
            wcaBomb.logBomb(fullMessage, username, bomb, universal.info.currentWorld)
            wcaCore.hub('Bomb')
          }
        }
      }
    }
  }
}
msg.onBossBarUpdated = function onBossBarUpdated (bossBar) {
  // COMMENT: get off the server if a bomb is in the bossbar
  const bombBarRegex = /(.+) from (.+) \[(\d+) min\]/
  const bossBarString = color.stripthes(bossBar.title.text)
  if (bombBarRegex.test(bossBarString)) {
    clearTimeout(universal.timer.hubTimer)
    log.log(`going to hub because bomb was detected on BossBar on ${universal.info.currentWorld}`)
    wcaCore.hub('Bomb_BossBar')
  }
}
msg.logShout = function logShoutToDiscord (fullMessage, username, world, shoutMessage) {
  // COMMENT: Custom Shout Message Formatting
  client.guilds.cache.get(config.guildid).channels.cache.get(config.shoutChannel).send(`[${new Date(Date.now()).toLocaleTimeString('en-US')}]` + ` [${world}] \`${username}\`: \`${shoutMessage}\``)
}
module.exports = msg