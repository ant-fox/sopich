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
const remapControlsButton = document.getElementById('remap-controls-button')
const remapControlsList =  document.getElementById('remap-controls-list')
const remapControlsResetButton = document.getElementById('remap-controls-reset-button')

import { KeyboardMapping, setOneKeyboardMapping, resetKeyboardMapping } from '../../controller.js'

function firstKeyDown( $element, continuation ){
    function onKeydown( { code } ){
        continuation( code )
        $element.removeEventListener('keydown',onKeydown)
    }
    $element.addEventListener('keydown',onKeydown)    
}
function updateMappedKeySpan( type, KeyboardMapping ){
    const spanId = `remap-control-${ type }-key`
    const mappedKeysSpan = document.getElementById( spanId )
    mappedKeysSpan.innerHTML = KeyboardMapping[ type ].join(' ')
    
}
function remapControlsButtonClicked(){  
    
    remapControlsList.classList.toggle('hidden')

    remapControlsResetButton.onclick = () => {
        resetKeyboardMapping( KeyboardMapping )
        Object.keys( KeyboardMapping ).forEach( type => {
            updateMappedKeySpan( type, KeyboardMapping )
        })
              
    }
    
    Object.keys( KeyboardMapping ).forEach( type => {

        updateMappedKeySpan( type, KeyboardMapping )
        
        const buttonId = `remap-control-${ type }-button`
        const remapButton = document.getElementById( buttonId )        
        console.log(buttonId, remapButton )
        remapButton.onclick = e => {
            remapButton.classList.add('active-remapping')
            console.log( buttonId, remapButton )
            firstKeyDown( window.document, code => {
                console.log('type',type,code)
                setOneKeyboardMapping( type, code )
                updateMappedKeySpan( type, KeyboardMapping )
                remapButton.classList.remove('active-remapping')

            })
        }
    })
}
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
