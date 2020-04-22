import io from 'socket.io-client';
import { throttle } from 'throttle-debounce';
import { processGameUpdate } from './state';
import { stopRendering } from './render'
import { ADD_PLAYER_RETURNS } from '../../game'

const Constants = require('../shared/constants');
//const socket = io(`ws://${window.location.host}`, { reconnection: false, secure : true });
//const socket = io('https://localhost');
const socket = io();

const connectedPromise = new Promise(resolve => {
    socket.on('connect', () => {
        console.log('Connected to server!');
        resolve();
    });
});
function onPlayerNotAddedf( joinFailed) {
    return function onPlayerNotAdded(o){
        console.log('could not play because', o)
        let r = ''
        switch ( o ){
        case ADD_PLAYER_RETURNS.WRONG_USERNAME : r = 'wrong username' 
            break ;
        case ADD_PLAYER_RETURNS.ALREADY_JOINED : r = 'already joined' 
            break ;
        case ADD_PLAYER_RETURNS.USERNAME_TOO_LONG : r = 'username too long' 
            break ;
        case ADD_PLAYER_RETURNS.NO_MORE_AVAILABLE_ITEM : r = 'game is full' 
            break ;
        case ADD_PLAYER_RETURNS.USERNAME_ALREADY_IN_USE : r = 'already playing' 
            break ;
        }
        joinFailed( r )
    }
}
function onPlayerAddedf( joinSuccess ){
    return function onPlayerAdded(){
        console.log('ajoined !')
        joinSuccess()
    }
}
function onYourInfof( yourInfo ){
    return function (...args){
        yourInfo( ...args )
        console.log('oooo',this,args)
    }
}
export const connect = (onGameOver,joinSuccess,joinFailed,yourInfo) => (
    connectedPromise.then(() => {
        // Register callbacks
        socket.on(Constants.MSG_TYPES.YOUR_INFO, function(...args){
            console.log('-------------------',args)
            onYourInfof( yourInfo )(...args);
        })
        socket.on(Constants.MSG_TYPES.JOINED_GAME_OK, onPlayerAddedf( joinSuccess ) );
        socket.on(Constants.MSG_TYPES.JOINED_GAME_KO, onPlayerNotAddedf( joinFailed ) );
        socket.on(Constants.MSG_TYPES.GAME_UPDATE, processGameUpdate);
        socket.on(Constants.MSG_TYPES.GAME_OVER, onGameOver);
        socket.on('disconnect', () => {
            stopRendering()
            console.log('Disconnected from server.');
            document.getElementById('disconnect-modal').classList.remove('hidden');
            document.getElementById('reconnect-button').onclick = () => {
                window.location.reload();
            };
        });
    })
);

export const play = username => {
    console.log('PLAY',username,'?')
    socket.emit(Constants.MSG_TYPES.JOIN_GAME, username, function(o){
        console.log('ooooooooooooooooooo',o)
    });
};

export const sendInputToServer = throttle(20, dir => {
    socket.emit(Constants.MSG_TYPES.INPUT, dir );
});
export const sendKeyboardMappingToServer = mapping => {
    socket.emit(Constants.MSG_TYPES.KEYBOARD_MAPPING, mapping );
}
