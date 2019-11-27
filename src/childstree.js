//
// tree is recursive by property 'childs'
//

//
// tree properties augmentation
//
export function depthFirst( d, f, l = 0 ){
    f( d, l )
    if ( d.childs ){
        d.childs.forEach( c => depthFirst( c, f, l + 1 ) )
    }
}
export function setParentAndDepth( d, l = 0, parent ){
    if ( parent ){
        d.parent = parent
        d.l = l
    }
    if ( d.childs ){
        d.childs.forEach( c => setParentAndDepth( c, l + 1, d ) )
    }
    return d
}
export function setNextAndPreviousSibling( d ){
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
export function setPreviousNext( d ){
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
export function parents( d, f ){
    if ( d.parent ){
        f( d.parent )
        parents( d.parent, f )
    } 
}
export function parentsOrSelf( d, f ){
    f( d )
    if ( d.parent ){
        parentsOrSelf( d.parent, f )
    } 
}
export function toArray( f ){
    return function( d ){
        let a = []
        f( d, x => a.push( x ) )
        return a
    }
}
