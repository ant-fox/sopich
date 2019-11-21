const express = require('express');
const webpack = require('webpack');
const webpackDevMiddleware = require('webpack-dev-middleware');
const socketio = require('socket.io');

//import { clamp } from '../../../src/utils.js'

import { Game } from '../../game.js'



const Constants = require('../shared/constants');
//const Game = require('./game');
const webpackConfig = require('../../../webpack.dev.js');

// Setup an Express server
const app = express();
app.use(express.static('public'));

if (process.env.NODE_ENV === 'development') {
  // Setup Webpack for development
  const compiler = webpack(webpackConfig);
  app.use(webpackDevMiddleware(compiler));
} else {
  // Static serve the dist/ folder in production
  app.use(express.static('dist'));
}

// Listen on port
const port = process.env.PORT || 3000;
const server = app.listen(port);
console.log(`Server listening on port ${port}`);

// Setup socket.io
const io = socketio(server);

// Listen for socket.io connections
io.on('connection', socket => {
  console.log('connexion', socket.id);
  socket.on(Constants.MSG_TYPES.JOIN_GAME, joinGame);
  socket.on(Constants.MSG_TYPES.INPUT, handleInput);
  socket.on('disconnect', onDisconnect);
});

// Setup the Game
function tellPlayer( socketId, update ){
//    console.log('got to tell', socketId, update)
    io.to(`${socketId}`).emit( Constants.MSG_TYPES.GAME_UPDATE, update )
}
const game = new Game( { tellPlayer } )


function joinGame(username) {
    console.log('joinGame',this.id,username)
    game.addPlayer(this.id, username);
}

function handleInput(dir) {
    console.log('handleInput',this.id,dir)
    game.handleInput(this.id,dir);
}

function onDisconnect() {
    console.log('onDisconnect',this.id)
    game.removePlayer(this.id);
}
