// bird + flock  use anim
// collision broken -> coll mask non broken ?
// set y of ox and target at move step
// target offset (ground target)?
// throttle bomb/missile drop (+ rotation ?)
// bullets
// login
// mongo
// graphics px x 2 3 4 5 6....

import { ground } from './ground.js'
import { prepareHitmask, prepareBottomHitmask } from './symbols.js'
import { Tree, CONTINUE_VISIT, STOP_VISIT } from './coll.js'
import { clamp, posmod } from './utils.js'
import { rectangle_intersection } from './rect.js'


export const worldSize = {
    x1 : 0,
    x2 : 3000,
    y1 : 0,
    y2 : 800,
    w : 3000,
    h : 800
}
/*
 *
 */
const directions16 = new Array( 16 ).fill(0)
      .map( (_,i) => ( i * 2 * Math.PI / 16 ) )
      .map( x => [ Math.cos( x ), Math.sin( x ) ] )

const directions8 = new Array( 8 ).fill(0)
      .map( (_,i) => ( i * 2 * Math.PI / 8 ) )
      .map( x => [ Math.cos( x ), Math.sin( x ) ] )

const toFall8 = [7,0,6,4,5,6,6,6]
const Hitmasks = prepareHitmask()
const BottomHitmasks = prepareBottomHitmask()

function available_ttl( items ){
    for ( let i = 0, l = items.length ; i < l ; i++ ){
        if ( items[ i ].ttl <= 0 ){
            return i
        }
    }
    return items.length
}

export function Game( { tellPlayer } ) {
    
    const State = init_state()
    const inputs = []
    function init_falling_plane(){
        return {
            x : Math.floor( 100 + Math.random() * 2500 ),
            y : Math.floor( 100 + Math.random() * 200 ),
            step : 0,
            len : 2,
            dir : 1,
            loop : true,
            interv : 8,
            ttl : -1,
            as : 0,
            p : 1,
        }
    }
    function init_leaving_plane(){
        return {
            x : Math.floor( 100 + Math.random() * 2500 ),
            y : Math.floor( 100 + Math.random() * 200 ),
            step : 3,
            len : 4,
            dir : -1,
            loop : false,
            interv : 15,
            ttl : -1, 
            as : 3,
        }
    }    
    function init_ox( i , l ){
        return {
            x : Math.floor( 400 + ( i / l ) * 2000 ),
            as : 0,
        }
    }
    function init_bird( i, l ){
        return {
            x : Math.floor( 500 + ( i / l ) * 2000 ),
            y : Math.floor( 100 + ( i / l ) * 100 ),
            as : Math.floor( Math.random() * 2 ),
            interv : Math.floor( 3 + Math.random() * 2 ),
            step : 0
        }
    }
    function init_flock(i,l){
        return {
            x : Math.floor( 500 + ( i / l ) * 2000 ),
            y : Math.floor( 100 + ( i / l ) * 100 ),
            as : Math.floor( Math.random() * 2 ),
            interv : Math.floor( 5 + Math.random() * 5 ),
            step : 0
            
        }
    }
    
    function init_ground(){
        return ground.map( x => x )
    }
    function init_debris( i, x = 1600, y = 100 ){
        return {
            x : x+Math.floor( Math.random()*50 ),
            y : y+Math.floor( Math.random()*50 ),
            a : ( (i*((Math.random()>0.5)?1:2)) % 16 ),
            dtype : ( i % 8 ),
        }
    }
    function init_explosion(){
        return {
            p : 4,
            ttl : -1,
            step : 0,
            debris : new Array(16).fill(0).map( (_,i) => {
                return init_debris( i )
            })
        }       
    }
    function init_targets(){
        const model = {
            xs : [
	        191, 284, 409, 539, 685,
	        807, 934, 1210, 1240, 1440,
	        1550, 1750, 1780, 2024, 2159,
	        2279, 2390, 2549, 2678, 2763
            ],
            tys : [
	        1, 3, 1, 1, 3,
	        0, 1, 2, 0, 3,
	        3, 0, 2, 1, 1,
	        3, 3, 0, 0, 1
            ],
            hits : new Array(20).fill(false),
            broken : new Array(20).fill(false),
        }
        const targets = model.xs.map( (x,i) => {
            const as = model.tys[ i ]
            // let y = ground[ Math.floor( x ) % ground.length ]
            return {
                x,as,/*
                broken : false,
                hits: false*/
            }
        })
        return targets
    }
    function init_plane(idx){
        return {
            idx,
            ttl : 300,
            inputId : undefined,
            x : 250 + idx * 250,
            y : 100,
            r : false,
            a : 0,
            p : 2,
            //        hitmaskf : item => Hitmasks.plane[ (item.r)?1:0 ][ item.a ],
            bombs : new Array(8).fill(0).map( (_,i) => ({
                x : 1550+i*20,
                y : 100+i*10,
                a : i,
                p : 1,
                ttl : -1,
                step : 0,
                explosion : init_explosion(),
                owner : idx,
            })),
            missiles : new Array(16).fill(0).map( (_,i) => ({
                x : 1250+i*40,
                y : 100+i*10,
                a : i,
                p : 3,
                ttl : -1,
                step : 0,
                explosion : init_explosion(),
                owner : idx,
            })),
            explosion : init_explosion(),
            falling : init_falling_plane(),
            leaving : init_leaving_plane(),
            respawn : -1,
        }
    }
    function init_state(){
        return {
            ground : init_ground(),
            planes : new Array(20).fill(0).map( (_,i) => init_plane(i) ),
            targets : init_targets(),
            birds : new Array(20).fill(0).map( (_,i,r) => init_bird(i,r.length) ),
            flocks : new Array(4).fill(0).map( (_,i,r) => init_flock(i,r.length) ),
            oxs : new Array(12).fill(0).map( (_,i,r) => init_ox(i,r.length) ),
            //    pxcoll : { list : [] },
            version : 0,
            tree : new Tree( 4096, 1024, 16 ),
            showcolls : [],
            showtreecells : [],
        }
    }


    function init_client_merged_input( plane, planeIdx ){
        return {
            plane,
            planeIdx,
            dda : 0, reverse : 0, dds : 0, firebomb : 0, firemissile :0
        }
    }
    function init_client_merged_inputs(){
        return State.planes.map( init_client_merged_input )
    }

    const BombDropAngle = [0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8]
    const BombDropOffset = [[0,0]]
    function handleinputs(){

        let merged_inputs = init_client_merged_inputs()
        
        let dda = 0
        let reverse = 0
        let dds = 0
        let firebomb = 0
        let firemissile = 0
        while ( inputs.length ){
            const { input, client } = inputs.shift()
            let merged_input = merged_inputs[client]
            if ( merged_input ) {
                switch ( input ){
                case 'noseup' : merged_input.dda = 1 ; break
                case 'nosedown' : merged_input.dda = -1 ; break
                case 'reverse' : merged_input.reverse = 1 ; break
                case 'powerup' : merged_input.dds = 1 ; break
                case 'powerdown' : merged_input.dds = -1 ; break
                case 'firebomb' : merged_input.firebomb = 1 ; break
                case 'firemissile' : merged_input.firemissile = 1 ; break
                }
            }
        }
        merged_inputs.forEach( ({plane,dda,reverse,dds,firebomb,firemissile}) => {
            if ( plane.ttl < 0 ){
                return
            }
            const controlled_plane = plane
            const { x, y, r, a, p, bombs, missiles } = controlled_plane
            
            let da = dda
            controlled_plane.a = posmod( a + da, 16 )
            if ( reverse ){
                controlled_plane.r = !(controlled_plane.r)
            }
            let ds = dds
            controlled_plane.p = clamp( controlled_plane.p + ds, 0, 4)
            if (firebomb){
                let avail = available_ttl( bombs )
                if ( avail !== bombs.length ){
                    let off = BombDropOffset[ a % BombDropOffset.length]
                    let normal = ( a + (r?4:12) ) % directions16.length 
                    let dir = directions16[ normal ]
                    const bomb = bombs[ avail ]
                    bomb.x = x + off[0] + ( 16 / 2 ) - ( 8 / 2 ) + dir[0] * 8
                    bomb.y = y + off[1] + ( 16 / 2 ) - ( 8 / 2 ) + dir[1] * 8
                    bomb.p = clamp( p-1,1,3)
                    bomb.ttl = 100
                    bomb.step = 0
                    bomb.a = a >> 1
                }
            }
            if (firemissile){
                let off = BombDropOffset[ a % BombDropOffset.length]
                let normal = ( a + (r?4:12) ) % directions16.length 
                let dir = directions16[ normal ]
                let avail = available_ttl( missiles )
                if ( avail !== missiles.length ){
                    const missile = missiles[ avail ]
                    missile.x = x + off[0] + ( 16 / 2 ) - ( 8 / 2 ) + dir[0] * 8
                    missile.y = y + off[1] + ( 16 / 2 ) - ( 8 / 2 ) + dir[1] * 8
                    missile.ttl = 100
                    missile.p = 4
                    missile.step = 0
                    missile.a = a
                }
            }
        })
    }


    function move_explosion( explosion ){
        if ( explosion.ttl > 0 ){
            const debris = explosion.debris
            if ( explosion.ttl < 5 ){
                explosion.p = clamp( explosion.p - 1,1,5)
            }
            const p = explosion.p
            for ( let j = 0, ll = debris.length ; j < ll ; j++ ){
                let debri = debris[ j ]
                let { x, y, a, ttl, dtype } = debris[ j ]
                if ( explosion.ttl < 4 ){
                    a = 12
                }
                let dx = directions16[ a ][ 0 ] * p * 4
                let dy = directions16[ a ][ 1 ] * p * 4
                debris[j].x = x + dx
                debris[j].y = y + dy
                debris[j].step += 1
            }
            explosion.ttl -= 1
        }
    }
    function move_anim( leaving ){
        if ( leaving.ttl > 0 ){
            if ( leaving.step && ( ( leaving.step  % leaving.interv ) === 0 ) ){
                if ( leaving.loop ){
                    leaving.as = posmod( leaving.as + leaving.dir, leaving.len )
                } else {
                    let next_as = leaving.as + leaving.dir
                    if ( next_as < 0 ){
                        leaving.ttl = -1
                    } else {
                        leaving.as = clamp( leaving.as + leaving.dir, 0, leaving.len )
                    }
                    /*let nexti = leaving.as + leaving.dir
                      if ( ( nexti < 0 ) || ( nexti >= leaving.len ) ){
                      leaving.ttl = -1
                      }*/
                }
            }
            leaving.step++
            leaving.ttl--
        }
    }
    
    function move(){

        State.planes.forEach( plane => {
            const { x, y, r, a, p, bombs, missiles, explosion, leaving, falling } = plane
            let dx = directions16[ a ][ 0 ] * p * 2
            let dy = directions16[ a ][ 1 ] * p * 2
            
            if ( plane.ttl >= 0 ){

                plane.x = x + dx
                plane.y = y + dy
                if ( plane.y > worldSize.y2 ){ // TODO
                    plane.a = 12
                    //        State.plane.r = !(State.plane.r)
                    
                }
            } else {
                plane.respawn -= 1
                if ( plane.respawn < 0 ){
                    plane.ttl = 1000
                    plane.y = 256
                    plane.p = 1
                }
            }
            move_anim( leaving )
            move_anim( falling )
            if ( falling.ttl > 0 ){
                falling.y -= falling.p
            }
            
            ///
            
            move_explosion( explosion )
            
            for ( let i = 0, l = bombs.length ; i < l ; i++ ){
                const bomb = bombs[i]
                if ( bomb.ttl <= 0 ){
                } else {
                    const { x, y, a, p, ttl, step } = bomb
                    let dx = directions8[ a ][ 0 ] * p * 2
                    let dy = directions8[ a ][ 1 ] * p * 2
                    bomb.x = x + dx
                    bomb.y = y + dy
                    if ( step === 20 ){
                        bomb.step = 0
                        bomb.a = toFall8[ a ]
                    } else {
                        bomb.step += 1
                    }
                    bomb.ttl -= 1
                }

                
                //const explosion = bomb.explosion
                move_explosion( bomb.explosion )
                
            }
            for ( let i = 0, l = missiles.length ; i < l ; i++ ){
                const missile = missiles[i]
                if ( missile.ttl <= 0 ){
                } else {
                    const { x, y, a, p, ttl, step } = missile
                    let dx = directions16[ a ][ 0 ] * p * 2
                    let dy = directions16[ a ][ 1 ] * p * 2
                    missile.x = x + dx
                    missile.y = y + dy
                    if ( step === 20 ){
                        missile.step = 0
                        //missile.a = toFall8[ a ]
                    } else {
                        missile.step += 1
                    }
                    missile.ttl -= 1
                }
                move_explosion( missile.explosion )
            }
        })
        State.flocks.forEach( flock => {
            if ( ( flock.step % flock.interv ) === 0 ){
                flock.as = ( flock.as + 1)%2
                flock.x = Math.floor( flock.x + ( Math.random() * 2 ) - 1 )
                flock.y = Math.floor( flock.y + ( Math.random() * 2 ) - 1 )
            }
            flock.step++
        })
        State.birds.forEach( bird => {
            if ( ( bird.step % bird.interv ) === 0 ){
                bird.as = ( bird.as + 1)%2
                bird.x = Math.floor( bird.x + ( Math.random() * 4 ) - 2 )
                bird.y = Math.floor( bird.y + ( Math.random() * 4 ) - 2 )
            }
            bird.step++
        })

        
        
    }
    function pixel_collision(b,
                             x1,y1,w1,h1,hm1,
                             x2,y2,w2,h2,hm2 ){
        let docoll = false
        for ( let j = b.b; j < b.t ; j++ ){
            let ly1 = Math.floor( j - y1 )
            let ly2 = Math.floor( j - y2 )
            for ( let i = b.l; i < b.r ; i++ ){
                let lx1 = Math.floor( i - x1 )
                let lx2 = Math.floor( i - x2 )
                let p1 = hm1.mask[ lx1 ][ ly1 ]
                let p2 = hm2.mask[ lx2 ][ ly2 ]
                if ( p1 && p2 ){
                    /*
                      if ( State.pxcoll.list.length > 40000 ){
                      State.pxcoll.list.shift()
                      }
                      State.pxcoll.list.push( [ i, j, getRandomColor()] )
                    */
                    docoll = true
                    return true
                }
            }
        }
        return docoll
    }
    function pixel_bottom_collision(fx,y,bhitmask){
        let collides = false
        const ground = State.ground
        
        const mask = bhitmask.mask
        const w = bhitmask.w    
        for ( let i = 0; i < w ; i++ ){
            let gheight = ground[ ( i + fx )  % ground.length ]
            let m = mask[ i ]
            if ( m < bhitmask.h ){
                let pheight = y + m
                if ( pheight <= gheight ){
                    
                    //if ( State.pxcoll.list.length > 40000 ){
                    //State.pxcoll.list.shift()
                    //}
                    //State.pxcoll.list.push( [ i+fx, pheight,getRandomColor()] )
                    // modify ground
                    ground[  ( i + fx )  % ground.length ] = pheight
                    collides = true
                }
            }
        }
        return collides
    }
    function collisions2(){
        State.version++

        const version = State.version 
        const tree = State.tree
        let ncoll = 0;
        
    }

    
    function start_explosion( explosion, x, y ){
        explosion.ttl = 10
        explosion.step = 0
        explosion.p = 2
        const debris = explosion.debris
        for ( let j = 0, ll = debris.length ; j < ll ; j++ ){
            const debri = debris[ j ]
            debri.x = x
            debri.y = y
        }
    }
    function start_falling( item ){
        if ( item.falling ){
            // TODO
            item.falling = init_falling_plane()
            item.falling.x = item.x
            item.falling.y = item.y
        }
        if ( item.respawn ){
            item.respawn = 30
        }
    }
    const SOTypes = [ 'plane' ]
    
    function iterateStateObjects( f ){
        //f( 'ground', State.ground )

        State.oxs.forEach( ox => f( 'ox', ox ) )
        State.targets.forEach( (target,i) => f( 'target', target ) )
        State.birds.forEach( bird => f( 'bird', bird ) )
        State.flocks.forEach( flock => f( 'flock', flock ) )

        State.planes.forEach( plane => {
            const { bombs, missiles, explosion } = plane
            f( 'plane', plane )
            // explosion.debris.forEach( debri => f( 'debris', debri ) )
            bombs.forEach( bomb => {
                 const { explosion } = bomb
                 f( 'bomb', bomb )
                //     // explosion.debris.forEach( debri => f( 'debris', debri ) )
            })
             missiles.forEach( missile => {
                 const { explosion } = missile
                 f( 'missile', missile )
            //     // explosion.debris.forEach( debri => f( 'debris', debri ) )
             })

        })
    }
    function collisions(){
//        State.tree = new Tree( 4096, 256, 16 )

        // to move ?
        State.oxs.forEach( ox => {
            const { x } = ox
            const y =  ground[ Math.floor( x ) % ground.length ]
            ox.y = y
        })
        State.targets.forEach( ox => {
            const { x } = ox
            const y =  ground[ Math.floor( x ) % ground.length ]
            ox.y = y
        })
        
        State.planes[ 0 ].undescrtu = true
        let c = { }
        let total = 0
        //
        State.showcolls = []
        State.showtreecells = []

        const tree = State.tree
        State.version++
        const version = State.version
        const Hitmaskfs = {
            plane : item => Hitmasks.plane[ (item.r)?1:0 ][ item.a ],
            bomb : item => Hitmasks.bomb[ item.a ],
            missile : item => Hitmasks.missile[ item.a ],
            flock : item => Hitmasks.flock[ item.as ],
            bird : item => Hitmasks.bird[ item.as ],
            target : item => Hitmasks.targets[ item.as ],
            /*target : item => 
                return {
                    Hitmasks.targets[ 
                    
                }
            }
            */
            ox : item => Hitmasks.ox[ item.as ],
        }
        const Bhitmaskfs = {
            plane : item => BottomHitmasks.plane[ (item.r)?1:0 ][ item.a ],
            bomb : item => BottomHitmasks.bomb[ item.a ],
            missile : item => BottomHitmasks.missile[ item.a ],            
        }
        iterateStateObjects( (type,item1) => {
            if ( ( item1.ttl !== undefined ) && ( item1.ttl < 0 ) ){
                return
            }
            // stats
            total++;
            const ct = c[ type ]
            c[ type ] = 1 + (ct?ct:0)

            // set hitmask
            const hitmask = Hitmaskfs[ type ]( item1 )
            item1._hitmask = hitmask

            // test ground
            if ( item1.ttl ){
                if ( Bhitmaskfs[ type ] ){
                    const bhitmask = Bhitmaskfs[ type ](  item1 )
                    const x = item1.x
                    const fx = Math.floor(x)
                    const y = item1.y
                    let collides = pixel_bottom_collision(fx,y,bhitmask)
                    if ( collides ) {
                        item1.ttl = -1
                        start_explosion( item1.explosion,fx ,y )
                        start_falling( item1 )
                    }
                }
            }

            

            // insert/collide
            const { x, y } = item1
            let node = tree.insert(
                { x,y, w:hitmask.w,h:hitmask.h, item :item1 },
                version,
                (candidates) => {
                    for ( let i = 0, l = candidates.length ; i < l ; i++ ){
                        const candidate = candidates[ i ]
                        if ( ( candidate.ttl !== undefined ) && ( candidate.ttl < 0 ) ){
                            continue
                        }
                        const item2 = candidate.item
                        let hitmask2 = item2._hitmask
                        let o = {}
                        let dont = false
                        
                        if ( ( item1.owner !== undefined ) && ( item2.idx !== undefined )){                                    
                            dont = item1.owner === item2.idx 
                        }
                        
                        if ( ( item2.owner !== undefined ) && ( item1.idx !== undefined )){                                    
                            dont = item2.owner === item1.idx 
                        }
                        if ( ( item1.owner !== undefined ) && ( item2.owner !== undefined )){                                    
                            dont = item1.owner === item2.owner
                        }
                        if ( (!dont) && rectangle_intersection( x,y,hitmask.w,hitmask.h,
                                                                item2.x,item2.y,hitmask2.w,hitmask2.h, o ) ){
                            
                            State.showcolls.push( o )
                          
                                if ( item1.explosion ) {                                
                                    start_explosion( item1.explosion, x, y )
                                }
                                if ( item2.explosion ) {
                                    start_explosion( item2.explosion, item2.x, item2.y )
                                }
                                if ( (!item1.undescrtu) && ( item1.ttl !== undefined ) ){
                                    item1.ttl = -1
                                }
                                if ( (!item2.undescrtu) && ( item2.ttl !== undefined ) ){
                                    item2.ttl = -1
                                }
                                if ( (!item2.undescrtu) ){
                                    item2._node.remove( item2 )
                                    //item2_.node = undefined
                                }
                          

                            return STOP_VISIT
                       } else {
                            return CONTINUE_VISIT
                        }
                    }
                }
            )
            if ( node ){
                State.showtreecells.push( node )
                item1._node = node
            }
            
            
        })
        //console.log(total,c)        
    }
    function collisions2(){
        State.version++

        const version = State.version 
        const tree = State.tree
        let ncoll = 0;
        State.planes.forEach( plane => {
            const { x, y, r, a, p, bombs, missiles, explosion } = plane
            
            const { xs, tys, hits, broken } = State.targets
            const ground = State.ground

            /*
              collisions with items
            */
            
            ;[ [ [ plane ], item => Hitmasks.plane[ (item.r)?1:0 ][ item.a ] ],
               [ bombs, item => Hitmasks.bomb[ item.a ] ],
               [ missiles, item => Hitmasks.missile[ item.a ] ]
             ].forEach( ([ items, hitmaskf ]) => {
                 items.forEach( item => {
                     
                     if (( item.ttl === undefined ) || (item.ttl > 0 )){
                         
                         const explosion = item.explosion               
                         const hitmask = hitmaskf( item )
                         const x = item.x
                         const y = item.y
                         tree.insert(
                             { x,y,w:hitmask.w,h:hitmask.h, item },
                             version,
                             () => { ncoll++ }
                         )
                         
                         //const { x, y, r, a, p, explosion } = item //State.plane
                         for ( let i = 0 ; i < xs.length ; i++ ){
                             const tx = xs[ i ]
                             const ty = ground[ Math.floor( tx ) % ground.length ]
                             const hit = hits[ i ]
                             const ttype = tys[ i ] // type
                             const o = {}
                             if ( rectangle_intersection( x,y,hitmask.w,hitmask.h, tx,ty,16,16, o ) ){
                                 if ( pixel_collision( o, x,y,hitmask.w,hitmask.h, hitmask, tx,ty,16,16, Hitmasks.targets[ ttype ]) ){
                                     
                                     hits[ i ] = o
                                     broken[ i ] = true
                                     start_explosion( explosion, tx ,ty )
                                     item.ttl = -1
                                     start_falling( item )
                                 }
                             } else {
                                 //hits[ i ] = false
                                 //broken[ i ] = false
                             }
                         }
                     }
                 })
             })

            
            /*
             * ground coll
             */
            
            ;[ [ [ plane ], item => BottomHitmasks.plane[ (item.r)?1:0 ][ item.a ] ],
               [ bombs, item => BottomHitmasks.bomb[ item.a ] ],
               [ missiles, item => BottomHitmasks.missile[ item.a ] ]
             ].forEach( ([ items, bhitmaskf ]) => {
                 items.forEach( item => {
                     if ( item.ttl > 0 ){
                         const bhitmask = bhitmaskf( item )
                         const x = item.x
                         const fx = Math.floor(x)
                         const y = item.y
                         let collides = pixel_bottom_collision(fx,y,bhitmask)
                         if ( collides ) {
                             item.ttl = -1
                             start_explosion( item.explosion,fx ,y )
                             start_falling( item )
                         }
                     }
                 })
             })
            
        })
        //        console.log('ncoll',ncoll)
    }



    function ia(){
        let commands = [
            'noseup',
            //    'nosedown',
            //'reverse','powerup',
            //'firemissile','firebomb'
        ]
        let clients = State.planes
            .map( (plane,idx) => [plane,idx] )
            .filter( ([plane,idx]) => plane.inputId === undefined )

        if ( clients ){
            for ( let i = 0 ; i < ( clients.length * 2 ) ; i++ ){
                let input = commands[ Math.floor( Math.random() * commands.length ) ]
                let client = clients[ Math.floor( Math.random() * clients.length ) ]
                inputs.push( { input, client:client[1] } )
            }
        }

    }

    function groundOxs(){
        const ground = State.ground
        const oxs = State.oxs
        oxs.forEach( ox => {
            const x = Math.floor( ox.x )
            let meany = 0;
            for ( let ii = 0 ; ii < 16 ; ii++ ){
                let wx = x + ii
                let h = ground[ Math.floor( wx ) % ground.length ]
                meany += h/16
            }        
            for ( let ii = 0 ; ii < 16 ; ii++ ){
                let wx = x + ii
                ground[ Math.floor( wx ) % ground.length ] = meany
            }
        })
    }
    function groundTargets(){
        const ground = State.ground
        const targets = State.targets
        targets.forEach( target => {
            const x = Math.floor( target.x )
            let meany = 0;
            for ( let ii = 0 ; ii < 16 ; ii++ ){
                let wx = x + ii
                let h = ground[ Math.floor( wx ) % ground.length ]
                meany += h/16
            }        
            for ( let ii = 0 ; ii < 16 ; ii++ ){
                let wx = x + ii
                ground[ Math.floor( wx ) % ground.length ] = meany
            }
        })
    }
    /*
      let PAUSED = false
      let OFFSET = {x:0,y:0}

      document.body.addEventListener('keydown', ({ code }) => {
      switch ( code ){
      case 'Pause' : PAUSED = !PAUSED
      break
      case 'Numpad1' : OFFSET.x -= 1
      break
      case 'Numpad3' : OFFSET.x += 1
      break
      case 'Numpad2' : OFFSET.y -= 1
      break
      case 'Numpad5' : OFFSET.y += 1
      break
      }
      })
    */
    groundTargets()
    groundOxs()

    // const FPS = 16//16//2//16
    const FPS = 10//16//5
    State.lastUpdateTime = Date.now()


    function update(){
        const now = Date.now()
        //
        const dt = (now - State.lastUpdateTime) / 1000;
        let rfps =  1 / dt / FPS
        if ( ( rfps > 1.5 ) || ( rfps < 0.75 ) ){
            console.error( `update after ${ dt }s, should be ${ 1/FPS }s `,
                           `at ${ 1 / dt }fps, should be ${ FPS  }fps  `)
        }
        
        const controlled_debug_plane = State.planes[0]
        
        //
        // controlled_debug_plane.x += OFFSET.x
        // controlled_debug_plane.y += OFFSET.y
        // OFFSET = {x:0,y:0}
        //
        //State.pxcoll.list = []
        //
        //if ( !PAUSED ){
        ia()
        handleinputs()
        move()
        //}
        collisions()
        
        //
        // display.setState( State )
        stateUpdated()
        
        State.lastUpdateTime = now;
    }
    
    function gameloop(){
        setInterval( update, 1000/FPS)
    }

    ////
    const planeByInputId = {}
    const nameByInputId = {}
    function addPlayer( inputId, name ){
        const plane = State.planes.find( x => x.inputId === undefined )
        if ( plane ){
            planeByInputId[ inputId ] = plane
            nameByInputId[ inputId ] = name
            plane.inputId = inputId
            plane.x = 500 + Math.floor( Math.random() * 1000 )
            plane.y = 100
            plane.p = 0
        }
    }
    function removePlayer( inputId ){
        const plane = planeByInputId[ inputId ]
        if ( plane ){
            delete planeByInputId[ inputId ]
            delete nameByInputId[ inputId ]
            plane.inputId = undefined
        }
    }
    function handleInput( inputId, input ){
        let plane  =  planeByInputId[ inputId ]
        if ( plane ){
            inputs.push({
                input,
                client : State.planes.findIndex( p => plane === p )
            })
        }        
    }
    function stateUpdated(){
        let now = Date.now()
        let payload = {
            t : now,
            version : State.version,
            planes : [],
            explosions : [],
            bombs : [],
            missiles : [],
            debris : [],
            ground : State.ground,
            targets : [],
            birds : [],
            oxs : [],
            flocks : [],
            fallings : [],
            leavings : [],
            //showcolls : State.showcolls,
            //showtreecells : State.showtreecells,
        }
        State.targets.forEach( target => {
            let { x, y, as } = target
            payload.targets.push( { x, y, as } )
        })
        State.flocks.forEach( flock => {
            let { x, y, as } = flock
            payload.flocks.push( { x, y, as } )
        })
        State.birds.forEach( bird => {
            let { x, y, as } = bird
            payload.birds.push( { x, y, as } )
        })
        State.oxs.forEach( ox => {
            let { x, y, as } = ox
            payload.oxs.push( { x, /*y, */as } )
        })

        State.planes.forEach( plane => {
            let { ttl, x, y, r, a, p, explosion, leaving, falling } = plane
            let name = '?'
            if ( plane.inputId ){
                name = nameByInputId[ plane.inputId ]
            }

            // TODO
            //if ( ttl > 0 ){
            payload.planes.push( { ttl, x, y, r, a, p, name } )
            //}
            if ( true ){
                {
                const {x,y,as,ttl} = leaving
                if ( ttl > 0 ){
                    payload.leavings.push({x,y,as})
                }
            }
            {
                const {x,y,as,ttl} = falling
                if ( ttl > 0 ){
                    payload.fallings.push({x,y,as})
                }
            }
            
            if ( explosion.ttl > 0 ){
                explosion.debris.forEach( debri => {
                    let { x, y, a, dtype } = debri
                    payload.debris.push( { x, y, a, dtype } )
                })
            }
            
            
            plane.bombs.forEach( bomb => {
                let { x, y, a, p, ttl,  step, explosion } = bomb
                payload.bombs.push( { x, y, a, p, ttl /*, step */ } )
                if ( explosion.ttl > 0 ){
                    explosion.debris.forEach( debri => {
                        let { x, y, a, dtype } = debri
                        payload.debris.push( { x, y, a, dtype } )
                    })
                }
                
            })
            plane.missiles.forEach( missile => {
                let { x, y, a, p, ttl, step, explosion } = missile
                payload.missiles.push( { x, y, a, p, ttl /*, step */ } )
                if ( explosion.ttl > 0 ){
                    explosion.debris.forEach( debri => {
                        let { x, y, a, dtype } = debri
                        payload.debris.push( { x, y, a, dtype } )
                    })
                }                
            })
            }
        })
                            
        Object.keys( planeByInputId ).forEach( inputId => {
            let plane = planeByInputId[ inputId ]
            let me = {
                type : 'planes',
                idx : State.planes.findIndex( p => plane === p )
            }
            /*for ( let i = 0 ; i < Object.keys( payload ).length ; i++ ){
                let n = Object.keys( payload )[ i ]
                let p = payload[ n ]
                console.log('=',n)
                JSON.stringify( p )
            }
*/
            // console.log( JSON.stringify( payload ) )
            tellPlayer( inputId, Object.assign( { me } , payload ) )
        })
    }
    gameloop()
    return {
        addPlayer,
        removePlayer,
        handleInput,
    }
}

