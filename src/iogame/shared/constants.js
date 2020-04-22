module.exports = Object.freeze({
  PLAYER_RADIUS: 20,
  PLAYER_MAX_HP: 100,
  PLAYER_SPEED: 400,
  PLAYER_FIRE_COOLDOWN: 0.25,

  BULLET_RADIUS: 3,
  BULLET_SPEED: 800,
  BULLET_DAMAGE: 10,

  SCORE_BULLET_HIT: 20,
  SCORE_PER_SECOND: 1,

  MAP_SIZE: 3000,
    MSG_TYPES: {
        YOUR_INFO : 'your_info',
        JOINED_GAME_OK : 'joined_game_ok',
        JOINED_GAME_KO : 'joined_game_ko',
        JOIN_GAME: 'join_game',
        GAME_UPDATE: 'update',
        INPUT: 'input',
        KEYBOARD_MAPPING : 'keyboard_mapping',
        GAME_OVER: 'dead',        
    },
});
