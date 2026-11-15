// Icons from the Kubai Icons library (MIT, see assets/icons/LICENSE.txt), drawn in NEXTORA's
// colours and saved as 96px PNGs: `ink` for resting, `clay` for active or highlighted.
export const ICONS = {
  'list-checks': { ink: require('../../../assets/icons/list-checks.ink.png'), clay: require('../../../assets/icons/list-checks.clay.png') },
  'book-open': { ink: require('../../../assets/icons/book-open.ink.png'), clay: require('../../../assets/icons/book-open.clay.png') },
  'message-circle': { ink: require('../../../assets/icons/message-circle.ink.png'), clay: require('../../../assets/icons/message-circle.clay.png') },
  'users': { ink: require('../../../assets/icons/users.ink.png'), clay: require('../../../assets/icons/users.clay.png') },
  'messages': { ink: require('../../../assets/icons/messages.ink.png'), clay: require('../../../assets/icons/messages.clay.png') },
  'user-round': { ink: require('../../../assets/icons/user-round.ink.png'), clay: require('../../../assets/icons/user-round.clay.png') },
  'sim-card': { ink: require('../../../assets/icons/sim-card.ink.png'), clay: require('../../../assets/icons/sim-card.clay.png') },
  'fingerprint': { ink: require('../../../assets/icons/fingerprint.ink.png'), clay: require('../../../assets/icons/fingerprint.clay.png') },
  'tram': { ink: require('../../../assets/icons/tram.ink.png'), clay: require('../../../assets/icons/tram.clay.png') },
  'shopping-cart': { ink: require('../../../assets/icons/shopping-cart.ink.png'), clay: require('../../../assets/icons/shopping-cart.clay.png') },
  'stethoscope': { ink: require('../../../assets/icons/stethoscope.ink.png'), clay: require('../../../assets/icons/stethoscope.clay.png') },
  'plug': { ink: require('../../../assets/icons/plug.ink.png'), clay: require('../../../assets/icons/plug.clay.png') },
  'school': { ink: require('../../../assets/icons/school.ink.png'), clay: require('../../../assets/icons/school.clay.png') },
  'home': { ink: require('../../../assets/icons/home.ink.png'), clay: require('../../../assets/icons/home.clay.png') },
  'heart': { ink: require('../../../assets/icons/heart.ink.png'), clay: require('../../../assets/icons/heart.clay.png') },
  'calendar': { ink: require('../../../assets/icons/calendar.ink.png'), clay: require('../../../assets/icons/calendar.clay.png') },
  'messages-square': { ink: require('../../../assets/icons/messages-square.ink.png'), clay: require('../../../assets/icons/messages-square.clay.png') },
  'map': { ink: require('../../../assets/icons/map.ink.png'), clay: require('../../../assets/icons/map.clay.png') },
  'languages': { ink: require('../../../assets/icons/languages.ink.png'), clay: require('../../../assets/icons/languages.clay.png') },
  'lock': { ink: require('../../../assets/icons/lock.ink.png'), clay: require('../../../assets/icons/lock.clay.png') },
  'circle-help': { ink: require('../../../assets/icons/circle-help.ink.png'), clay: require('../../../assets/icons/circle-help.clay.png') },
} as const;
export type IconName = keyof typeof ICONS;
export type IconTone = 'ink' | 'clay';
