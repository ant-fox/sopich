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
const remapControlsButton = document.getElementById('remap-controls-button')
const remapControlsList =  document.getElementById('remap-controls-list')
const remapControlsResetButton = document.getElementById('remap-controls-reset-button')

import { KeyboardMapping, setOneKeyboardMapping, resetKeyboardMapping } from '../../controller.js'

/*
 * controls remap 
 */
function firstKeyDown( $element, continuation ){
    function onKeydown( { code } ){
        continuation( code )
        $element.removeEventListener('keydown',onKeydown)
    }
    $element.addEventListener('keydown',onKeydown)
    return () => $element.removeEventListener('keydown',onKeydown)
}
function updateMappedKeySpan( type, KeyboardMapping ){
    const spanId = `remap-control-${ type }-key`
    const mappedKeysSpan = document.getElementById( spanId )
    mappedKeysSpan.innerHTML = KeyboardMapping[ type ].join(' ')
    
}
function onMappingUpdated(){
    // updated in client    
    // send to server
    sendKeyboardMappingToServer( KeyboardMapping )
}
function keyboardMappingLoaded( keyboardMapping ){
    console.log('loaded KeyboardMapping',keyboardMapping)
    Object.keys( KeyboardMapping ).forEach( type => {
        if ( keyboardMapping !== undefined ){
            const code = keyboardMapping[ type ]
            setOneKeyboardMapping( KeyboardMapping, type, code )
            updateMappedKeySpan( type, KeyboardMapping )
        }
    })
}
function remapControlsButtonClicked(){  
    
    remapControlsList.classList.toggle('hidden')

    remapControlsResetButton.onclick = () => {
        resetKeyboardMapping( KeyboardMapping )
        Object.keys( KeyboardMapping ).forEach( type => {
            updateMappedKeySpan( type, KeyboardMapping )
        })
        onMappingUpdated()
    }
    
    Object.keys( KeyboardMapping ).forEach( type => {
        updateMappedKeySpan( type, KeyboardMapping )
        const buttonId = `remap-control-${ type }-button`
        const remapButton = document.getElementById( buttonId )        
        console.log(buttonId, remapButton )
        remapButton.onclick = e => {
            remapButton.classList.add('active-remapping')
            console.log( buttonId, remapButton )
            const cancelFkd = firstKeyDown( window.document, code => {
                console.log('type',type,code)
                setOneKeyboardMapping( KeyboardMapping, type, code )
                updateMappedKeySpan( type, KeyboardMapping )
                remapButton.classList.remove('active-remapping')
                onMappingUpdated()
            })
            
        }
    })
}
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
