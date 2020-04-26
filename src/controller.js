const DefaultKeyboardMapping = {
    'noseup' : ['KeyI','ArrowLeft'],
    'nosedown' : ['KeyK','ArrowRight'],
    'reverse' : ['KeyL','ArrowUp'],
    'powerup'  : ['KeyE','KeyA','PageUp'] ,
    'powerdown': ['KeyR','keyZ','PageDown'] ,
    'firemissile': ['KeyM','ShiftRight'] ,
    'firebomb': ['KeyP','ControlRight'] ,
    'fireguidedmissile': ['Space','Enter'] ,
}

export const KeyboardMapping = {}
let mappingByKey = {}
resetKeyboardMapping( KeyboardMapping )

function updateMappingByKey(){
    Object.entries( KeyboardMapping ).forEach( ([input,keys]) => {
        keys.forEach( key => {
            mappingByKey[ key ] = input
        })
    })
    console.log({mappingByKey})
}


export function resetKeyboardMapping( KeyboardMapping ){
    Object.entries( DefaultKeyboardMapping ).forEach( ([k,v]) => {
        KeyboardMapping[ k ] = v.map( x => x )
    })
    updateMappingByKey()
}
export function setOneKeyboardMapping(KeyboardMapping, action, key ){
    KeyboardMapping[ action ] = [ key ]
    updateMappingByKey()
}

export function Controller( input_send0 ){

    /* Keyboard */
    
    function onKeydown( { code } ){
        const input = mappingByKey[ code ]
        if ( input ){
            input_send0( input )  
        }
    }
    function connectKeyboard(){
        document.body.addEventListener('keydown', onKeydown)
    }
    function disconnectKeyboard(){
        document.body.removeEventListener('keydown', onKeydown)
    }

    /* Gamepad */
    
    window.addEventListener("gamepadconnected", function(e) {
        console.log("Contrôleur n°%d connecté : %s. %d boutons, %d axes.",
                    e.gamepad.index, e.gamepad.id,
                    e.gamepad.buttons.length, e.gamepad.axes.length);
    });
    window.addEventListener("gamepaddisconnected", function(e) {
        console.log("Contrôleur n°%d déconnecté : %s. %d boutons, %d axes.",
                    e.gamepad.index, e.gamepad.id,
                    e.gamepad.buttons.length, e.gamepad.axes.length);
    });
    

    function readGamepad( gamepad ){ 
        const buttons = gamepad.buttons // 0 1 2 3 a d x y
        // console.log( buttons.map( (x,i) => [ i, x.pressed ] ).filter( ([i,p]) => p ).join(' ') )

        if ( buttons[ 0 ].pressed ){
            input_send0( 'firebomb' ) 
        }
        if ( buttons[ 1 ].pressed ){
            input_send0( 'fireguidedmissile' ) 
        }
        if ( buttons[ 2 ].pressed ){
            input_send0( 'firemissile' ) 
        }
        if ( buttons[ 4 ].pressed ){
            input_send0( 'powerdown' ) 
        }
        if ( buttons[ 5 ].pressed ){
            input_send0( 'powerup' ) 
        }

        //
        //             axis 1                   axis 4
        //
        //              -1                        -1
        //               ^                         ^
        //  axis 0  -1  <->  1      axis 3    -1  <->  1      
        //               `                         ` 
        //               1                         1
        //
        //
        const axes = gamepad.axes
        function checkAxis( value, a, b ){
            if ( Math.abs( value ) > 0.01 ){
                return ( value < 0 )?a:b
            }
        }
        let a0 = checkAxis( axes[ 0 ], 'noseup','nosedown' )
        if ( a0 ){
            input_send0( a0 ) 
        }
    }
    function readGamePads(){
        const gamepads = navigator.getGamepads ? navigator.getGamepads() : (navigator.webkitGetGamepads ? navigator.webkitGetGamepads() : []);
        for (let i = 0; i < gamepads.length; i++) {
            if (gamepads[i]) { 
                readGamepad( gamepads[ i ] )
            }
        }
    }
    let gamepadCheckInterval = undefined
    function connectGamepad(){
        if ( gamepadCheckInterval === undefined )
            gamepadCheckInterval = window.setInterval( readGamePads )
    }
    function disconnectGamepad(){
        if ( gamepadCheckInterval !== undefined )
            window.clearInterval( gamepadCheckInterval )
    }

    /*
     * exports
     */
    function connect(){
        connectKeyboard()
        connectGamepad()
    }
    function disconnect(){
        disconnectKeyboard()
        disconnectGamepad()
    }

    return {
        connect,
        disconnect
    }
}
