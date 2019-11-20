import { rectangle_intersection, rectangle_includes } from './rect.js'

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
        let qw, qh
        if ( w > min ) qw = w / 2
        if ( h > min ) qh = h / 2
        if ( qw || qh ){
            qw = qw?qw:w
            qh = qh?qh:h
            this.quads = [
                new Node(this.ox, this.oy+qh, qw, qh,min, this, depth+1),
                new Node(this.ox+qw, this.oy+qh, qw, qh,min, this, depth+1),
                new Node(this.ox+qw, this.oy, qw, qh,min, this, depth+1),
                new Node(this.ox, this.oy, qw, qh,min, this, depth+1)
            ]
        } else {
            this.quads = undefined
        }
    }
    includes(x2,y2,w2,h2){
        return rectangle_includes(this.ox,this.oy,this.w,this.h,
                                  x2,y2,w2,h2)
    }
    dbg(){
        return ['depth:',this.depth,',',this.ox,':',this.oy,',',this.w,'x',this.h].join(' ')
    }
    visit( version, collides ){
        if ( this.items.length ){
            collides( this.items )
        }
        if ( ( this.quads ) && ( this.version === version ) ){
            this.quads[ 0 ].visit( version, collides )
            this.quads[ 1 ].visit( version, collides )
            this.quads[ 2 ].visit( version, collides )
            this.quads[ 3 ].visit( version, collides )
        }
    }
    insert( item, version, collides ){
        if ( this.version !== version ){
            this.items = []
            this.version = version
        } else if ( this.items.length ){
            collides( this.items )
        }
        let { x, y, w, h } = item
        if ( this.quads ){
            if ( this.quads[ 0 ].includes( x,y,w,h ) ){
                return this.quads[ 0 ].insert( item, version, collides )
            } else if ( this.quads[ 1 ].includes( x,y,w,h ) ){
                return this.quads[ 1 ].insert( item, version, collides )
            } else if ( this.quads[ 2 ].includes( x,y,w,h ) ){
                return this.quads[ 2 ].insert( item, version, collides )
            } else if ( this.quads[ 3 ].includes( x,y,w,h ) ){
                return this.quads[ 3 ].insert( item, version, collides )
            } else {
                this.quads[ 0 ].visit( version, collides )
                this.quads[ 1 ].visit( version, collides )
                this.quads[ 2 ].visit( version, collides )
                this.quads[ 3 ].visit( version, collides )
                this.items.push( item )
            }
        } else {
            this.items.push( item )
        }
        return this
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
