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
    return {
        connect,
        disconnect
    }
}
