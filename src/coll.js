//
// all the tree is build at startup ( except each node item list )
// further insertion search is controlled by provided collision function
// works on an *2 ratio,
// bouding w and h may be different
// use versionning on insert to remove the need to clean the tree
//
import { rectangle_intersection, rectangle_includes } from './rect.js'
export const CONTINUE_VISIT = 0
export const STOP_VISIT = 1
class Node {
    constructor( ox, oy, w, h, min, parent, depth = 0 ){
        this.depth = depth
        this.ox = ox
        this.oy = oy
        this.w = w
        this.h = h
        this.parent = parent
        this.items = []
        this.version = 0
        let dw,dh

        // if the node is not a square, divide only largest dimension
        if ( w > min ){
            if ( w === h ){
                dw = 2
            } else if ( w > h ) {
                dw = 4
            } else {
                dw = 1
            }
        } 
        if ( h > min ){ 
            if ( w === h ){
                dh = 2
            } else if ( h > w ) {
                dh = 4
            } else {
                dh = 1
            }
        }
        
        if ( (!dh) || (!dw) || (dh+dw === 2 ) ){
            // no more division
            this.quads = undefined
        } else {
            let qw = w / dw
            let qh = h / dh
            this.quads = []
            for ( let i = 0 ; i < dw ; i++ ){
                const qx = ox + ( w / dw ) * i
                for ( let j = 0 ; j < dh ; j++ ){
                    const qy = oy + ( h / dh ) * j
                    const node =  new Node( qx, qy, qw, qh, min, this, depth+1)
                    this.quads.push( node )
                }
            }
        }
    }
    includes(x,y,w,h){
        return rectangle_includes(this.ox,this.oy,this.w,this.h,x,y,w,h)
    }
    visit( version, collidesf ){
        if ( this.version === version ){
            if ( this.items.length ){
                if ( collidesf( this.items ) === STOP_VISIT ){
                    return STOP_VISIT
                }
            }
        }
        if ( ( this.quads ) && ( this.version === version ) ){
            for ( let i = 0 ; i < 4 ; i++ ) {
                let r = this.quads[ i ].visit( version, collidesf )                   
                if ( r === STOP_VISIT ){
                    return STOP_VISIT
                }
            }
        }
    }
    insert( item, version, collidesf ){
        if ( this.version !== version ){
            this.items = []
            this.version = version
        } else if ( this.items.length ){
            if ( collidesf( this.items ) === STOP_VISIT ){
                return
            }
        }
        let { x, y, w, h } = item
        if ( this.quads ){
            if ( this.quads[ 0 ].includes( x,y,w,h ) ){
                return this.quads[ 0 ].insert( item, version, collidesf )
            } else if ( this.quads[ 1 ].includes( x,y,w,h ) ){
                return this.quads[ 1 ].insert( item, version, collidesf )
            } else if ( this.quads[ 2 ].includes( x,y,w,h ) ){
                return this.quads[ 2 ].insert( item, version, collidesf )
            } else if ( this.quads[ 3 ].includes( x,y,w,h ) ){
                return this.quads[ 3 ].insert( item, version, collidesf )
            } else {
                for ( let i = 0 ; i < 4 ; i++ ) {
                    let r = this.quads[ i ].visit( version, collidesf )                   
                    if ( r === STOP_VISIT ){
                        return
                    }
                }
                this.items.push( item )
            }
        } else {
            this.items.push( item )
        }
        return this
    }
    remove( obj ){
        // TODO
        this.items = this.items.filter( item => {
            return item.item !== obj
        })
    }
    dbg(){
        return ['depth:',this.depth,',',this.ox,':',this.oy,',',this.w,'x',this.h].join(' ')
    }
}
export class Tree {   
    constructor( w, h, min, depth = 0 ){
        this.w = w
        this.h = h
        this.min = min    
        this.root = new Node( 0, 0, w, h, min )
    }
    insert( item, version, f ){
        return this.root.insert( item, version, f )
    }
}
// function test(){
// let tree = new Tree( 4096, 256, 16 )
// ///console.log( tree.root )
// function maycollide( elements ){
//     console.log('maycollide',elements)
// }
// let version = 1
// function insert( item ){
//     return tree.insert(
//         item,
//         version,
//         maycollide
//     )
// }
// console.log('==')
// //console.log( node1 )
// //let node2 = insert( { x:1,y:1,w:8,h:8,data:'bib' } )
// let node1 = insert( { x:0,y:0,w:8,h:8,data:'bob' } )
// console.log('==')
// let node2 = insert( { x:5,y:0,w:800,h:8,data:'bqb' } )
// console.log('==')
// let node3 = insert( { x:2048,y:0,w:800,h:8,data:'bqb' } )
// }
//console.log( tree.root )
