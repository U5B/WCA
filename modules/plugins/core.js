const config = require('../config/config.js')
const universal = require('../universal')
const log = require('../logging')
const simplediscord = require('../simplediscord')
const housing = require('./housing.js')

const wcaCore = {}
wcaCore.hub = function (message, force) {
  if (universal.state.onWorld || force) {
    simplediscord.sendTime(config.discord.log.statusChannel, `${config.msg.hubMessage} [${message}] <@!${config.discord.admin.masterUser}>`)
    universal.droid.chat('/hub')
  }
}
wcaCore.compass = async function (reason) {
  if (!reason) reason = ''
  if (universal.state.compassCheck) {
    await universal.sleep(4000)
  } else {
    await universal.sleep(1000)
  }
  // COMMENT: If already on a world, loading the resource pack or is has been kicked from the server, then do nothing
  if (universal.state.onWorld || !universal.state.onWynncraft || universal.state.serverSwitch) return
  log.log('Checking compass')
  universal.droid.setQuickBarSlot(0)
  // COMMENT: assume that it is slightly stuck if the held item is nothing
  if (!universal.droid.heldItem) {
    log.log(universal.droid.heldItem)
  } else {
    const itemHeld = universal.droid.heldItem.name
    log.log(itemHeld)
    // COMMENT: click on the recommended world if holding a compass
    // TODO: maybe have it select a world with low player count and/or low uptime
    // I want to minimize it taking up player slots in critical areas
    clearInterval(universal.timer.cancelCompassTimer)
    async function compassActivate () {
      log.log('Clicking compass...')
      simplediscord.sendTime(config.discord.log.statusChannel, `${config.msg.worldReconnectMessage} [Lobby] [${reason}]`)
      universal.droid.activateItem()
    }
    if (itemHeld === 'compass') {
      // COMMENT: retry on lobby or restart if hub is broken
      await compassActivate()
      universal.timer.cancelCompassTimer = setInterval(() => {
        if (universal.state.onWynncraft && !universal.state.onWorld && !universal.state.serverSwitch) {
          compassActivate()
        }
      }, 10000)
    }
  }
}
wcaCore.onWindowOpen = async function (window) {
  window.requiresConfirmation = false
  // COMMENT: this is used so that I can technically support any gui in one section of my code
  const windowText = JSON.parse(window.title).text
  if (windowText === 'Wynncraft Servers') {
    // COMMENT: Hardcoded to click on the recommended server slot - might need to be changed if Wynncraft updates their gui
    await universal.sleep(500)
    await universal.droid.clickWindow(13, 0, 0)
    universal.state.compassCheck = true
    log.log('Clicked recommended slot.')
  } else if (windowText === 'Go to house') {
    housing.clickSlot()
  } else if (windowText === '§8§lSelect a Class') {
    log.error(`somehow in class menu "${windowText}" going to hub - use /toggle autojoin`)
    log.debug(window.slots)
    await universal.sleep(500)
    universal.droid.closeWindow(window)
    wcaCore.hub('Class Menu', true)
  } else {
    // COMMENT: debugging purposes, this shouldn't happen unless stuck in the class menu
    log.error(`opened unknown gui with title "${windowText}"`)
    log.debug(window.slots)
    log.debug(windowText)
    universal.droid.closeWindow(window)
  }
}
wcaCore.chatLog = function (message, messageString, excludeSpam) {
  const jsonString = JSON.stringify(message.json)
  log.verbose(jsonString)
  // COMMENT: Champion Nickname detector - used to get the real username of the bomb thrower and guild messages
  if (message.json.extra) {
    for (let i = 0; i < message.json.extra.length; i++) {
      // check if the nicked IGN matches
      if (message.json?.extra[i].extra?.[0]?.hoverEvent?.value?.[2]?.text === universal.info.droidIGN && message.json?.extra[i].extra?.[0]?.hoverEvent?.value?.[1]?.text === '\'s real username is ') {
        universal.info.droidNickedIGN = message.json.extra[i]?.extra?.[0]?.hoverEvent?.value?.[0]?.text
        universal.info.realIGN = message.json.extra[i]?.extra?.[0]?.hoverEvent?.value?.[2]?.text
      } else if (message.json?.extra[i].extra?.[0]?.hoverEvent?.value?.[1]?.text === '\'s real username is ') {
        universal.info.realIGN = message.json.extra[i]?.extra?.[0]?.hoverEvent?.value?.[2]?.text
        // nickUsername = message.json?.extra[i].extra?.[0]?.hoverEvent?.value?.[0]?.text
      }
    }
  }
  if (!excludeSpam.test(messageString)) log.chat(message.toMotd())
}
wcaCore.onWorldJoin = function (username, world, wynnclass) {
  // COMMENT: Your now on a world - you have stopped loading resource pack lol
  universal.state.onWorld = true
  universal.state.serverSwitch = false
  // COMMENT: Set the currentWorld to the current World instead of WC0
  universal.info.currentWorld = world
  log.log(`Online on ${world}`)
  simplediscord.sendTime(config.discord.log.statusChannel, `${config.msg.worldConnectMessage}`)
  simplediscord.status() // COMMENT: check discord status
  if (config.state.housingTracker) {
    housing.start()
  }
}
wcaCore.lobbyError = function (reason) {
  if (reason == null) reason = ' '
  if (universal.state.onWorld || universal.state.serverSwitch) {
    wcaCore.hub(reason, true)
  } else {
    wcaCore.compass(reason)
  }
}
module.exports = wcaCore
