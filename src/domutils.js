export function DomControllerf( $e, name, handler ){
    function start(){
        $e.addEventListener( name, handler )
    }
    function stop(){
        $e.removeEventListener( name, handler )
    }
    return { start, stop }
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

