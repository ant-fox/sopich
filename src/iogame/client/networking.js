//import io from 'socket.io-client';

import { throttle } from 'throttle-debounce';
import { processGameUpdate } from './state';
import { stopRendering } from './render'
import { ADD_PLAYER_RETURNS } from '../../game'

const Constants = require('../shared/constants');

const gameName = 'monsocketserver1'
const socketUrl = new URL( gameName, window.location )
socketUrl.protocol = "ws:"
console.log( 'create socket with',socketUrl.toString() )
const socket = new WebSocket( socketUrl )

const connectedPromise = new Promise(resolve => {
    socket.onopen = ( () => {
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
function deserializeMessage( data ){
    const [ type, body ] = JSON.parse( data.data )
    return [ type, body ]
}
function serializeMessage( type, body ){
    const data = JSON.stringify( [ type, body ] )
    return data
}
function sendMessage( type, body ){
    return socket.send( serializeMessage( type, body ) )
}
export const connect = (onGameOver,joinSuccess,joinFailed,yourInfo) => (
    connectedPromise.then(() => {

        socket.onmessage = data => {
            const [ type, body ] = deserializeMessage( data )
            switch (type){
            case Constants.MSG_TYPES.YOUR_INFO : {
                onYourInfof( yourInfo )(body)
                break
            }
            case Constants.MSG_TYPES.JOINED_GAME_OK : {
                onPlayerAddedf( joinSuccess )(body)
                break
            }
            case Constants.MSG_TYPES.JOINED_GAME_KO : {
                onPlayerNotAddedf( joinFailed )(body )
                break
            }
            case Constants.MSG_TYPES.GAME_UPDATE : {
                processGameUpdate(body )
                break
            }
            case Constants.MSG_TYPES.GAME_OVER : {
                onGameOver( ...body )
                break
            }
            }
        }
        socket.onclose = () => {
            console.log('Disconnected from server.');
            stopRendering()
            document.getElementById('disconnect-modal').classList.remove('hidden');
            document.getElementById('reconnect-button').onclick = () => {
                window.location.reload();
            };
        };
    })
);

export const play = username => {
    sendMessage(Constants.MSG_TYPES.JOIN_GAME, username )
};

export const sendInputToServer = throttle(20, dir => {
    sendMessage(Constants.MSG_TYPES.INPUT, dir );
});

export const sendKeyboardMappingToServer = mapping => {
    sendMessage(Constants.MSG_TYPES.KEYBOARD_MAPPING, mapping );
}
