import { connect, play, sendKeyboardMappingToServer } from './networking';
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

import { remapControlsButton, remapControlsButtonClicked, keyboardMappingLoaded } from './remapcontrols.js'
/*
 * index
 */ 
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
    remapControlsButton.onclick = () => {        
        remapControlsButtonClicked()
    }
    
}).catch(console.error);

function onGameStarting(){
    playMenu.classList.add('hidden');
    document.body.classList.add('no-overflow')
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
    console.log('youtinfoindex',info)
    usernameDiv.innerHTML = info.username
    const { keyboardMapping } = info
    keyboardMappingLoaded( keyboardMapping )
}
