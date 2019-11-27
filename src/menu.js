import { Dispatcher } from './dispatch.js'
import { clamp, chainf, fsetk, defined, posmod, centerText } from './utils.js'
import { DomControllerf , DomControllerDispatch } from './domutils.js'

const Definitions = chainf( [
    setParentAndDepth,
    setPreviousNext,
    setNextAndPreviousSibling
])(
    { name : 'config', childs : [
        { name : 'sound', childs : [
            { name : 'mute', h : Switch( 1 ) },
            { name : 'general', h : Fader() },
            { name : 'detail', childs : [
                { name : 'engine', h : Fader() },
                { name : 'missile', h : Fader() },
                { name : 'bomb', h : Fader() },
                { name : 'explosion', h : Fader() }
            ]}
        ]},
        { name : 'gfx', childs : [
            { name : 'more colors', h : Switch( 0 ) },
            { name : 'pixel zoom', h : Choice(['x1','x2','x3','x4'],
                                              [1,2,3,4])},
        ]},
        { name : 'game', childs : [
            { name : 'collision', h : Choice(['rectangle','rectangle+pixel'],[false,true]) },
            { name : 'fps', h : LinearQuantity(1,200) },
            { name : 'planes', h : LinearQuantity(5,14) },
        ]},
    ]}
)
//
// tree augmentation
//
function setParentAndDepth( d, l = 0, parent ){
    if ( parent ){
        d.parent = parent
        d.l = l
    }
    if ( d.childs ){
        d.childs.forEach( c => setParentAndDepth( c, l + 1, d ) )
    }
    return d
}
function setNextAndPreviousSibling( d ){
    let previous = undefined
    if ( d.childs ){
        d.childs.forEach( c => {
            if ( previous !== undefined ){
                c.previousSibling = previous
                previous.nextSibling = c
            }
            previous = c
            setNextAndPreviousSibling( c )
        })
    }
    return d
}
function setPreviousNext( d ){
    let previous = undefined
    depthFirst( d, ( d2, l ) => {
        if ( previous !== undefined ){
            d2.previous = previous
            previous.next = d2
        }
        previous = d2
    })
    return d
}

//
// generic tree functions
//
function depthFirst( d, f, l = 0 ){
    f( d, l )
    if ( d.childs ){
        d.childs.forEach( c => depthFirst( c, f, l + 1 ) )
    }
}
function parents( d, f ){
    if ( d.parent ){
        f( d.parent )
        parents( d.parent, f )
    } 
}
function parentsOrSelf( d, f ){
    f( d )
    if ( d.parent ){
        parentsOrSelf( d.parent, f )
    } 
}
function toArray( f ){
    return function( d ){
        let a = []
        f( d, x => a.push( x ) )
        return a
    }
}
//
// specific 
//
function locatorString( d ){
    return toArray( parentsOrSelf )( d )
        .reverse()
        .map( p => p.name.replace(/\s/g,'' ) )
        .join('.')
}
function nameString( d, selected ){
    return [
        ( selected?'>':' '),
        ' ',
        d.name,
        ( d.childs?'/':undefined)
    ].filter( x => x ).join('')
}

//
// rendering
//
function Choice( labels, reals = labels ){
    function length(){
        return labels.length 
    }
    function real( value ){
        return reals[ value ]
    }
    function text( value ){
        return labels[ value ]
    }
    function mod( ){
        return true
    }
    return { length, text, mod, real }
}
function LinearQuantity( min, max ){
    function length(){
        return ( max - min )
    }
    function real( value ){
        return min + value
    }
    function text( value ){
        return real( value )
    }
    return { length, real, text }
}
function Switch( truthvalue ){
    function length(){
        return 2
    }
    function text( value ){
        if ( value === truthvalue ){
            return 'on'
        } else {
            return 'off'
        }   
    }
    function mod(){
        return true
    }
    function real( value ){
        return ( value === truthvalue )
    }
    return { text, length, mod, real }
}
function Fader( max = 9 ){
    
    const linear = new Array( max + 1 ).fill( 0 ).map(
        (_,i,a) => i / ( a.length - 1 )
    )
    function length( ){
        return linear.length - 1
    }
    function text( value ){
        let l = length()
        let cont
        if ( value === 0 ){
            cont = centerText( 'muted', l, 'x' )
        } else {
            cont = [
                ".".repeat( value ),
                " ".repeat( length() - value ),
            ].join('')
        }
        return [ '[', cont, ']', ' ', ( value === 0 )?'':value ].join('')

    }
    function real( value ){
        return linear[ value ]
    }
    function mod(){
        return false
    }
    return { text, length, mod, real }
}
//
// Key Value Store
//
function Store( root ) {

    let version = 1
    
    const valueChange = new Dispatcher()
  
    const valueByLocatorString = toArray( depthFirst )( root )
          .filter( x => ( x.childs === undefined ) )
          .reduce( ( r, x ) => fsetk( r, locatorString( x ), 0 ), {} )

    const get = ls => valueByLocatorString[ ls ]
    const set = (ls, value) => valueByLocatorString[ ls ] = value
    const uptodateVersion = v => ( version === v )
    function tell( location, realOldValue, realNewValue ){
        valueChange.dispatch( { realOldValue, realNewValue, version }, location )
    }
    function modify( p, f, forceMod ){
        const location = locatorString( p )
        const oldValue = get( location )
        const length = ( p.h && p.h.length )?(p.h.length()):0
        if ( length > 0 ) {
            const doMod = forceMod || ( p.h && p.h.mod && p.h.mod() )
            const raw = f( oldValue )
            const mod = doMod?( posmod( raw, length ) ):raw
            const newValue = clamp( mod, 0, length )
            if ( oldValue !== newValue ){
                version++
                set( location, newValue )
                if ( p.h && p.h.real ){
                    let realOldValue = p.h.real( oldValue )
                    let realNewValue = p.h.real( newValue )
                    tell( location, realOldValue, realNewValue )
                } else {
                    tell( location, oldValue, newValue )
                }
            }
        }
    }
    return {
        get, modify, valueChange
    }
    
}
//
// Menu
//
export function Menu( Definitions, store ){
    
    const state = {
        root : Definitions,
        pointed : Definitions.childs[ 0 ].childs[ 2 ],
        visible : true
    }

    const definitionByLocatorString = toArray( depthFirst )( state.root )
          .reduce( ( r, x ) => fsetk( r, locatorString( x ), x ), {} )

    const $div = $buildContainer()
    hide()
    document.body.appendChild( $div )

    
    function $buildContainer(){
        let $div = document.createElement('pre') 
        $div.style = 'position:fixed;display:block;color:white;z-index:25;'
            +'width:100%;height:100%;'
            +'background-color:black;opacity:0.8;margin:0;padding-left:1em';
        $div.classList.add('noselect')
        return $div
    }
    function hide(){
        state.visible = false
        $div.style.visibility = 'collapse'
    }
    function show(){
        state.visible = false
        display()
        $div.style.visibility = 'visible'
    }
    function clickable( tag, d, text ){
        return `<${tag} locator=${locatorString(d)}>${ text }</${tag}>`  
    }
    
    function setPointed( p ){
        state.pointed = p
        //setDirty()
    }
    function check(){
        let p = state.pointed
        if ( p.parent === undefined ){
            setPointed( p.childs[ 0 ] )
        }
    }
    function valueText( p ){
        if ( p.childs )
            return
        let ls = locatorString( p ) 
        let v = store.get( ls )
        if ( p.h && p.h.text ){
            return p.h.text( v )
        } else {
            return v.toString()
        }
    }
    function display(){
        check()
        let pParent = state.pointed.parent
        let pParents = toArray( parents )( state.pointed ).reverse()
        let dirs = pParents.map( x => clickable('span', x, x.name )).join(' > ')

        let maxNameStringLength = pParent.childs
            .map( c => nameString( c, c === state.pointed ) )
            .reduce( (r,x) => Math.max( r, x.length ), 0 )

        let listing = pParent.childs.map(
            x => clickable('p',x, [
                nameString( x, x === state.pointed ).padEnd( maxNameStringLength ),
                valueText( x )
            ].filter( defined ).join(' : ' ) )
        ).join('')
        $div.innerHTML = [
            //'<p>'+locatorString( state.pointed ),
            '<p>'+dirs,
            listing
        ].join('')
    }
    function changeValue( f, forceMod ){
        const p = state.pointed
        if ( p.childs )
            return
        store.modify( p, f, forceMod )
    }
 
    // commands
    function inc( forceMod ) {
        changeValue( x => x + 1, forceMod )
    }
    function dec( forceMod ){
        changeValue( x => x - 1, forceMod )
    }
    function parent(){
        let p = state.pointed
        if ( p.parent )
            setPointed( p.parent )
    }
    function previous(){
        let p = state.pointed
        if ( p.previous )
            setPointed( p.previous )
    }
    function next(){
        let p = state.pointed
        if ( p.next )
            setPointed( p.next )
    }
    function previousSibling(){
        let p = state.pointed
        let x = p.previousSibling
        if ( x ) setPointed( x )
    }
    function nextSibling(){
        let p = state.pointed
        let x = p.nextSibling
        if ( x ) setPointed( x )
    }
    function at(locator){
        // point by locator,
        // then action
        let p = definitionByLocatorString[ locator ]
        if ( p ){
            setPointed( p )
            action(true)
        }
    }
    function action( forceMod ){
        // go to first child if folder
        // else increment
        let p = state.pointed
        if ( p.childs ){
            setPointed( p.next )
        } else {
            inc( forceMod )
        }
    }
    const commands = {
        inc,
        dec,
        action,
        at,
        parent,
        previousSibling,
        nextSibling,
        previous,
        next,
    }
    function onInput( type, ...args ){
        const cmd = commands[ type ]
        if ( cmd ){
            cmd( ...args)
        }
        display()
    }
    return {
        $div,
        onInput,
        show,
        hide
    }
}


const store = new Store( Definitions )
const menu = new Menu( Definitions, store  )

function onValueChange3( msg, type ){
    console.log('3 message meny say','type?',type, 'msg',msg )
}
store.valueChange.addListener( onValueChange3, 'config.sound.mute'  )

const mouseController = DomControllerf(
    menu.$div,
    'click',
    ({ srcElement }) => {
        if ( srcElement && srcElement.getAttribute ){
            let locator = srcElement.getAttribute('locator')
            if ( locator ){
                menu.onInput( 'at', locator )
            }
        }
    })

const keyboardController = DomControllerf(
    document.body,
    'keydown',
    ({ code }) => {
        switch ( code ){
        case'ArrowUp':menu.onInput('previousSibling');break
        case'ArrowDown':menu.onInput('nextSibling');break
        case'ArrowLeft':menu.onInput('previous');break
        case'ArrowRight':menu.onInput('next');break
        case'NumpadAdd':menu.onInput('inc');break
        case'NumpadSubtract':menu.onInput('dec');break
        case'Enter':menu.onInput('action');break
        case'Backspace':menu.onInput('parent');break
        }
    }
)

export function start(){
    menu.show()
    keyboardController.start()
    mouseController.start()
}
export function stop(){
    menu.hide()
    keyboardController.stop()
    mouseController.stop()
}
