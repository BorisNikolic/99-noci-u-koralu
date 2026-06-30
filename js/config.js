/* =========================================================================
 * 99 NOĆI U KORALU — config.js
 * Sve podesive vrednosti igre na jednom mestu. Lako za balansiranje i
 * proširenje (npr. promeni totalNights na 99 za punu igru).
 * ========================================================================= */
const CONFIG = {
  // Logička rezolucija (igra se renderuje na ovome pa skalira na ekran/tablet)
  view: { w: 1280, h: 800 },
  world: { w: 2560, h: 1760 },

  // Boje (paleta iz asset sheet-ova)
  colors: {
    sand: '#e6d3a8', sandDark: '#d4bc88',
    waterShallow: '#7fd0e0', waterDeep: '#2f7d96',
    stone: '#7b828c', stoneDark: '#565c66', stoneLight: '#9aa1ab',
    coralPink: '#e8788f', coralOrange: '#f08a3c', coralPurple: '#9b6fc4',
    seaweed: '#5f9a3a', seaweedDark: '#3f6f28',
    skin: '#f0c39a', skinShade: '#dba074', hair: '#4a3320',
    shortsTop: '#7fc24a', shortsBot: '#1f5fa8',
    shell: '#f2a64c', necklace: '#e08a2e',
    enemyBody: '#7fa84a', bucket: '#9aa1ab', bucketDark: '#6b727c',
    boss: '#2f8f8a', bossLight: '#9fd0c8', bossSnout: '#c7a878',
    friend: '#f4c842', friendFin: '#3aa0d6',
    night: '#0b1f4d', warn: '#e8503a', heart: '#e8503a', stamina: '#5fb8e0',
  },

  player: {
    radius: 17,
    walkSpeed: 178, runMult: 1.7,
    maxHealth: 100, maxHunger: 100, maxStamina: 100,
    startHealth: 100, startHunger: 95, startStamina: 100,
    attackDamage: 40, attackRange: 58, attackArc: 1.5,   // radijani (poluugao)
    attackCost: 10, attackCooldown: 0.40, attackDuration: 0.22,
    runCostPerSec: 16,
    invulnTime: 0.9,           // sekundi neranjivosti posle udarca
    pickupRange: 46,
  },

  hunger: {
    decayDay: 0.85,            // jedinica/sek tokom dana
    decayNight: 1.2,           // brže noću (blago, da deci ne bude prenaporno)
    runExtraPerSec: 0.9,       // dodatno dok trči
    attackExtra: 0.8,          // po napadu
    lowThreshold: 25,          // ispod ovoga: slabiji/sporiji junak (upozorenje)
    midThreshold: 50,
  },

  stamina: {
    regenFull: 20,             // /sek kad je hunger > midThreshold
    regenMid: 13,              // /sek kad je hunger izmedju low i mid
    regenLow: 9,               // /sek kad je hunger < lowThreshold
    burrowBonus: 14,           // dodatno /sek dok je u jazbini
  },

  health: {
    starveDrain: 4,            // /sek kad je hunger == 0 (blaže)
    burrowRegen: 7,            // /sek isceljenja u jazbini (ako hunger > low)
  },

  food: {
    coral: { hunger: 15, stamina: 0,  label: 'Koral' },
    shell: { hunger: 35, stamina: 20, label: 'Školjka' },
  },

  enemy: {
    radius: 16,
    speed: 74, speedNightMult: 1.28,
    health: 100, damage: 12,
    attackRange: 36, attackCooldown: 1.1, attackWindup: 0.35,
    detectRange: 210, detectRangeNight: 300,
    knockback: 120,
    wanderRadius: 150,
  },

  boss: {
    radius: 40,
    speed: 66, chargeSpeed: 360,
    health: 230, biteDamage: 16, chargeDamage: 24,
    detectRange: 300, biteRange: 64, biteCooldown: 1.6,
    chargeCooldown: 4.0, chargeWindup: 0.8, chargeDuration: 0.85,
    knockback: 220,
  },

  dayNight: {
    dayLength: 55,             // sekundi
    nightLength: 42,           // sekundi
    totalNights: 3,            // promeni na 99 za punu igru
    nightEnemyExtra: 2,        // dodatnih neprijatelja koji se pojave noću
  },

  decoration: {
    cost: { seaweed: 1 },      // koliko košta postavljanje jedne dekoracije
    types: ['lampa', 'zastava', 'krevet', 'sanduk', 'biljka'],
  },

  // Količina hrane/resursa na mapi
  spawns: {
    foodRespawn: 7,            // sek do ponovnog rasta hrane na praznom mestu
  },
};
