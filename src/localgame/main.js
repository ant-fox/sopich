import { Display } from '../display.js'
import { Controller } from '../controller.js'
import { Game } from '../game.js'
import { Audio } from '../audio.js'
import  * as Menu from '../menu.js'

 import { Tutuut } from './tutuut.js'

if (false){
  // menu
    const menu = new Menu.Menu( Menu.Definitions, Menu.defaultStore )
    
     function onValueChange3( msg, type ){
        console.log('3 message meny say','type?',type, 'msg',msg )
    }
     function onValueChange( msg, type ){
        console.log('! message meny say','type?',type, 'msg',msg )
    }
    Menu.defaultStore.valueChange.addListener( onValueChange3,  'config.sound.mute' )
    Menu.defaultStore.valueChange.addListener(
        onValueChange,
    )
   
    menu.start()
//    menu.show()

    // display 
    const display = new Display()
    display.animate()

    // sound
    const audio = new Audio()
    audio.start()

  
    // game
    function tellPlayer( inputId, state ){
        if ( inputId === '123456'){
            display.setState( state )
            audio.setState( state )
        } else {
            //console.log('worldpdate',state.version)
        }
    }
    let game = new Game( { tellPlayer } )
    game.addPlayer('123456','mick')
    game.addPlayer('1234567','joe')
    game.addPlayer('123467','zav')

    // controller
    function onInput( input ){
        game.handleInput( '123456', input )
    }
    const controller = new Controller( onInput )
    controller.connect()
}
