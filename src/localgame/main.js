import { Display } from '../display.js'
import { Controller } from '../controller.js'
import { Game } from '../game.js'
import { Audio } from '../audio.js'
import  * as Menu from '../menu.js'

// display 
const display = new Display()
display.animate()

// sound
const audio = new Audio()

// menu
// Menu.start()

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
game.addPlayer('123456','vivien')
game.addPlayer('1234567','joe')
game.addPlayer('123467','zav')

// controller
function onInput( input ){
    game.handleInput( '123456', input )
}
const controller = new Controller( onInput )
controller.connect()
