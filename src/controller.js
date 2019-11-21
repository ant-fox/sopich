export function Controller( input_send0 ){   
    function onKeydown( { code } ){
        switch ( code ){
        case 'ArrowLeft' : input_send0( 'noseup' ) 
            break
        case 'ArrowRight' : input_send0( 'nosedown' ) 
            break
        case 'ArrowUp' : input_send0( 'reverse' ) 
            break
        case 'PageUp' : input_send0( 'powerup' ) 
            break
        case 'PageDown' : input_send0( 'powerdown' ) 
            break
        case 'ShiftRight' : input_send0( 'firemissile' ) 
            break
        case 'Enter' : input_send0( 'firebomb' ) 
            break
        default : console.log(code)
        }
    }
    function connect(){
        document.body.addEventListener('keydown', onKeydown)
    }
    function disconnect(){
        document.body.removeEventListener('keydown', onKeydown)
    }
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
    window.setInterval( () => {
        const gamepads = navigator.getGamepads ? navigator.getGamepads() : (navigator.webkitGetGamepads ? navigator.webkitGetGamepads() : []);
        for (let i = 0; i < gamepads.length; i++) {
            if (gamepads[i]) {
                const buttons = gamepads[ i ].buttons
                /*for ( let j = 0, l = buttons.length ; j < l ; j++ ){
                    const button = buttons[ j ]
                    // 0 1 2 3 a d x y
                    if ( button.pressed ){
//                        console.log( j )
                    }
                }*/
                if ( buttons[ 0 ].pressed ){
                     input_send0( 'firebomb' ) 
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
                
                const axes = gamepads[ i ].axes
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
                function checkAxis( value, a, b ){
                    if ( Math.abs( value ) > 0.01 ){
                        return ( value < 0 )?a:b
                    }
                }
                let a0 = checkAxis( axes[ 0 ], 'noseup','nosedown' )
                if ( a0 ){
                    input_send0( a0 ) 
                }
                /*
                  for ( let j = 0, l = axes.length ; j < l ; j++ ){
                  const value = axes[ j ]
                  if ( Math.abs( value ) > 0.001 ){
                  console.log( j, value )
                  }
                  }
                */
            }
        }
    },1000/20)
    /*
      window.addEventListener("gamepadconnected", function(e) {
      var gp = navigator.getGamepads()[e.gamepad.index];
      console.log("Gamepad connected at index %d: %s. %d buttons, %d axes.",
      gp.index, gp.id,
      gp.buttons.length, gp.axes.length);
      });
      -*/
    return {
        connect,
        disconnect
    }
}
