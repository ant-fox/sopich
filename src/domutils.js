export function DomControllerf( $e, name, handler, started = false ){
    function start(){
        if ( started ) return
        $e.addEventListener( name, handler )
        started = true
    }
    function stop(){
        if ( !started ) return
        $e.removeEventListener( name, handler )
        started = false
    }
    return { start, stop, started }
}

import { Dispatcher } from './dispatch.js'

export function DomControllerDispatch( $e, name, handler ){
    const change = new Dispatcher()
    function handler( e ){
        change.dispatch( { change, e } )
    }
    return Object.assign(
        DomControllerf( $e, name, handler ),
        { change }
    )
    
}

