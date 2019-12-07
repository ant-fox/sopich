import { Dispatcher } from './dispatch.js'
import { clamp, chainf, fsetk, defined, posmod, centerText } from './utils.js'
import { DomControllerf , DomControllerDispatch } from './domutils.js'
import { setParentAndDepth,
         setNextAndPreviousSibling,
         setPreviousNext,
         depthFirst,
         parents,
         parentsOrSelf,
         toArray
       } from './childstree.js'


export const Definitions = chainf( [
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
//
// length : nb of alternative values
// mod    : 012012 or 012222
// real   : storable value
// text   : label string
//
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
// Key Value Store
// for indexed options
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
    
    function load( settings ){
        settings.forEach( ([locatorString,indexValue]) => {
            console.info( 'load', locatorString, '=', indexValue )
            if ( get( locatorString ) === undefined ){
                throw new Error('bad locator string : '+locatorString )
            } else {
                set( locatorString, indexValue )
                tell( locatorString, undefined, indexValue )
            }
        })
    }
    
    function tell( location, oldValue, value ){
        valueChange.dispatch( { oldValue, value, version }, location )
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
        load, get, modify, valueChange
    }
    
}
//
// View
//
function MenuView( storeGet ){
    function $buildContainer(){
        let $div = document.createElement('div') 
        $div.style = 'position:fixed;display:block;color:white;z-index:22;'
            +'width:100%;height:100%;'
            +'background-color:black;opacity:0.8;margin:0;padding-left:1em;'
            +'white-space:pre;font-family: mono;'
        $div.classList.add('noselect')
        return $div
    }
    const $div = $buildContainer()
    hide()

    function hide(){
        $div.style.visibility = 'collapse'
    }
    function show(){
        $div.style.visibility = 'visible'
    }
    function clickable( tag, d, text ){
        return `<${tag} locator=${locatorString(d)}>${ text }</${tag}>`  
    }
    function valueText( p ){
        if ( p.childs )
            return
        let ls = locatorString( p ) 
        let v = storeGet( ls ) // TODO
        if ( p.h && p.h.text ){
            return p.h.text( v )
        } else {
            return v.toString()
        }
    }
    function display(pointed){
        if ( !pointed ) return
        let pParent = pointed.parent
        if ( !pParent ) return

        let pParents = toArray( parents )( pointed ).reverse()
        let dirs = pParents.map( x => clickable('span', x, x.name )).join(' > ')

        let maxNameStringLength = pParent.childs
            .map( c => nameString( c, c === pointed ) )
            .reduce( (r,x) => Math.max( r, x.length ), 0 )
        
        let listing = pParent.childs.map(
            x => clickable('p',x, [
                nameString( x, x === pointed ).padEnd( maxNameStringLength ),
                valueText( x )
            ].filter( defined ).join(' : ' ) )
        ).join('')
        $div.innerHTML = [
            '<p>'+dirs,
            listing
        ].join('')
    }


    return {
        $div,
        display,
        show,
        hide
    }
}
function TreeController( pointed,  storeModify ){

    const definitionByLocatorString = toArray( depthFirst )( pointed )
          .reduce( ( r, x ) => fsetk( r, locatorString( x ), x ), {} )

    pointed = pointed.childs[ 0 ]
    
    function modifyPointed( f, forceMod ){
        const p = pointed
        if ( p.childs )
            return
        storeModify( p, f, forceMod )
    }
    function setPointed( p ){
        if ( p ){
            if ( p.parent !== null ){
                pointed = p
            }
        }
    }
    // commands
    function inc( forceMod ) {
        modifyPointed( x => x + 1, forceMod )
    }
    function dec( forceMod ){
        modifyPointed( x => x - 1, forceMod )
    }
    function parent(){
        setPointed( pointed.parent )
    }
    function previous(){
        setPointed( pointed.previous )
    }
    function next(){
        setPointed( pointed.next )
    }
    function previousSibling(){
        setPointed( pointed.previousSibling )
    }
    function nextSibling(){
        setPointed( pointed.nextSibling )
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
        let p = pointed
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
    return { commands, getPointed : () => pointed }
}

//
// Menu
//
export function Menu( Definitions, store ){
    
    const state = {
        visible : false
    }
    const view = new MenuView( store.get )
    document.body.appendChild( view.$div )
    
    const treeController = new TreeController( Definitions, store.modify )
    const keyboardControllerHideShow = DomControllerf(
        document.body, 'keydown',
        ({ code }) => {
            if ( code === 'Escape' ){
                switchShowHide()
            }
        }
    )
    const mouseController = DomControllerf(
        view.$div, 'click',
        ({ srcElement }) => {
            if ( srcElement && srcElement.getAttribute ){
                let locator = srcElement.getAttribute('locator')
                if ( locator ){
                    onInput( 'at', locator )
                }
            }
        })
    const keyboardController = DomControllerf(
        document.body, 'keydown',
        ({ code }) => {
            switch ( code ){
            case'ArrowUp':onInput('previousSibling');break
            case'ArrowDown':onInput('nextSibling');break
            case'ArrowLeft':onInput('previous');break
            case'ArrowRight':onInput('next');break
            case'NumpadAdd':onInput('inc');break
            case'NumpadSubtract':onInput('dec');break
            case'PageUp':onInput('inc');break
            case'PageDown':onInput('dec');break
            case'Enter':onInput('action');break
            case'Backspace':onInput('parent');break
            }
        }
    )
    
    function display(){
        view.display( treeController.getPointed() )
    }
    function switchShowHide(){
        if  (state.visible){
            hide()
        } else {
            show()
        }
    }
    function onInput( type, ...args ){
        const cmd = treeController.commands[ type ]
        if ( cmd ){
            cmd( ...args)
        }
        display()
    }

    function hide(){
        keyboardController.stop()
        mouseController.stop()
        view.hide()
        state.visible = false
    }
    function show(){
        keyboardController.start()
        mouseController.start()
        display()
        view.show()
        state.visible = true
    }
    function start(){
        keyboardControllerHideShow.start()
        if ( state.visible ){
            show()
        }
    }
    function stop(){
        hide()
        keyboardControllerHideShow.stop()
    }
    
    return {
        show,
        hide,
        start,
        stop,
    }
}


export const defaultStore = new Store( Definitions )
/*
function onValueChange3( msg, type ){
    console.log('3 message meny say','type?',type, 'msg',msg )
}
*/
//store.valueChange.addListener( onValueChange3, 'config.sound.mute'  )
