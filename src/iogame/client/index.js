// Learn more about this file at:
// https://victorzhou.com/blog/build-an-io-game-part-1/#3-client-entrypoints
import { connect, play } from './networking';
import { startRendering, stopRendering } from './render';
import { startCapturingInput, stopCapturingInput } from './input';
import { initState } from './state';

import './css/main.css';
import  * as Menu from '../../menu.js'

const usernameDiv = document.getElementById('username');
const playMenu = document.getElementById('play-menu');
const playButton = document.getElementById('play-button');
const usernameInput = document.getElementById('username-input');
const notJoinedReason = document.getElementById('not-joined-reason');
const menu = new Menu.Menu( Menu.Definitions, Menu.defaultStore )

Promise.all([
    connect( onGameOver, onGameStarting, onGameNotStarting, onYourInfo ),
    //  downloadAssets(),
]).then(() => {
    console.log('PROMISE FILED')
    playMenu.classList.remove('hidden');
    //usernameInput.focus();
    playButton.onclick = () => {
        // Play!
        play(/*usernameInput.value*/);
        //onGameStarting()
        
        //    setLeaderboardHidden(false);
    };
}).catch(console.error);

function onGameStarting(){
    playMenu.classList.add('hidden');    
    menu.start()
    initState();
    startCapturingInput();
    startRendering();
    
}
function onGameNotStarting( cause ){
    console.log('not joined becasue', cause )
    notJoinedReason.textContent = cause
    playMenu.classList.remove('hidden');
}

function onGameOver() {
    menu.stop()
    stopCapturingInput();
    stopRendering();
    playMenu.classList.remove('hidden');
    //  setLeaderboardHidden(true);
}
function onYourInfo( info ){
    console.log('youtinfoindex.js',info)
    usernameDiv.innerHTML = info.username
}
