import { sendKeyboardMappingToServer } from './networking';
/*
 * controls remap 
 */
export const remapControlsButton = document.getElementById('remap-controls-button')
const remapControlsList =  document.getElementById('remap-controls-list')
const remapControlsResetButton = document.getElementById('remap-controls-reset-button')
const remapControlsKeydownZone = document.getElementById('remap-controls-keydown-zone')

import { KeyboardMapping, setOneKeyboardMapping, resetKeyboardMapping } from '../../controller.js'

function firstKeyDown( $element, continuation ){
    function onKeydown( { code } ){
        console.log('keydown',code)
        continuation( code )
        $element.removeEventListener('keydown',onKeydown)
        event.preventDefault()
        event.stopPropagation()
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
export function keyboardMappingLoaded( keyboardMapping ){
    console.log('loaded KeyboardMapping',keyboardMapping)
    Object.keys( KeyboardMapping ).forEach( type => {
        if ( keyboardMapping !== undefined ){
            const code = keyboardMapping[ type ]
            setOneKeyboardMapping( KeyboardMapping, type, code )
            updateMappedKeySpan( type, KeyboardMapping )
        }
    })
}
export function remapControlsButtonClicked(){  
    console.log('oo')
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
        remapButton.onkeyup = e => {
            event.preventDefault()
            event.stopPropagation()
        }
        remapButton.onclick = e => {
            remapButton.classList.add('active-remapping')
            console.log( buttonId, remapButton )
            remapControlsKeydownZone.classList.remove('hidden');
            const cancelFkd = firstKeyDown( document.body, code => {
                console.log('type',type,code)
                remapControlsKeydownZone.classList.add('hidden');

                setOneKeyboardMapping( KeyboardMapping, type, code )
                updateMappedKeySpan( type, KeyboardMapping )
                remapButton.classList.remove('active-remapping')
                onMappingUpdated()
            })
            
        }
    })
}
