import { Display } from '../display.js'
import { Controller } from '../controller.js'
import { Game } from '../game.js'
import { Audio } from '../audio.js'
import  * as Menu from '../menu.js'

// import { Tutuut } from './tutuut.js'

if (true){
  // menu

    const menuStore = Menu.defaultStore
    const menu = new Menu.Menu( Menu.Definitions, menuStore  )
    
    function onValueChange3( msg, type ){
        console.log('3 message meny say','type?',type, 'msg',msg )
    }
    function onValueChange( msg, type ){
        console.log('! message meny say','type?',type, 'msg',msg )
    }
    //
    menuStore.valueChange.addListener( onValueChange )

   
    menu.start()
//    menu.show()

    // display 
    const display = new Display()
    display.animate()

    // sound
    const audio = new Audio()
    audio.start()


    function onConfigSoundMute({value}){
        if ( value ){
            audio.stop()
        } else {
            audio.start()
        }
    }
    function onConfigMix({value}, location ){
        let dest = location.replace(/.*\./,'')
        audio.mix( value, dest )
    }
    menuStore.valueChange.addListener( onConfigSoundMute,  'config.sound.mute' )
    menuStore.valueChange.addListener( onConfigMix,  'config.sound.general' )
//    menuStore.valueChange.addListener( onConfigMix,  'config.sound.detail.engine' )
    menuStore.valueChange.addListener( onConfigMix,  'config.sound.detail.missile' )
    menuStore.valueChange.addListener( onConfigMix,  'config.sound.detail.bomb' )
    menuStore.valueChange.addListener( onConfigMix,  'config.sound.detail.explosion' )

    menuStore.load([
        [ 'config.sound.general', 9 ],
        [ 'config.sound.detail.engine', 9 ],
        [ 'config.sound.detail.missile', 9 ],
        [ 'config.sound.detail.bomb' , 5 ],
        [ 'config.sound.detail.explosion', 9 ],
    ])
        

    
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
