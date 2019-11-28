//
// game modes
// - protect fort
// evenly spaced hq along x must be protected by same color plane
// base destruction -> -200
// - solo battle
// (normal count)
// - solo contest
//   -> limited time (max score)
//   -> limited score (min time)
// - by team
// like protect fort but with less hq types than players
// - invasion
// all forts belong to A team
// A team must destroy all opponent (n lives ?)
// B team must destroy all building
//
// - prime hunting
// value for shooting plane <- score.total
//
// bird + flock use anim
// collision broken -> coll mask non broken ?
// set y of ox and target at move step
// target offset (ground target)?
// throttle bomb/missile drop (+ rotation ?)
// bullets
// login
// mongo
// graphics px x 2 3 4 5 6....
// scoreboard
// option ( snd, fx... )
// plane color
// fix interpolation bypass
// pass explosion/missile/bomb start for audio
// sound problem at startup for iogame
// randomize collision order
// random sound at init
// when missile/bomb destroys missile/bomb, last emmited wins
// gun
// ground cannons
// balloons
import { ground } from './ground.js'
import { prepareHitmask, prepareBottomHitmask } from './symbols.js'
import { Tree, CONTINUE_VISIT, STOP_VISIT } from './coll.js'
import { clamp, posmod } from './utils.js'
import { rectangle_intersection } from './rect.js'
import { ColorSchemes } from './symbols.js'
export const worldSize = {
    x1 : 0,
    x2 : 3000,
    y1 : 0,
    y2 : 800,
    w : 3000,
    h : 800
}
export const PLANE_INPUT_NAMES = [
    'noseup','nosedown','reverse',
    'powerup','powerdown',
    'firebomb','firemissile'
]
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
const Hitmaskfs = {
    plane : item => Hitmasks.plane[ (item.r)?1:0 ][ item.a ],
    bomb : item => Hitmasks.bomb[ item.a ],
    missile : item => Hitmasks.missile[ item.a ],
    flock : item => Hitmasks.flock[ item.as ],
    bird : item => Hitmasks.bird[ item.as ],
    target : item => ((item.broken)
                      ?(Hitmasks.target_hit)
                      :(Hitmasks.targets[ item.as ])),
    ox : item => Hitmasks.ox[ item.as ],
}
const Bhitmaskfs = {
    plane : item => BottomHitmasks.plane[ (item.r)?1:0 ][ item.a ],
    bomb : item => BottomHitmasks.bomb[ item.a ],
    missile : item => BottomHitmasks.missile[ item.a ]
}
function available_ttl( items ){
    for ( let i = 0, l = items.length ; i < l ; i++ ){
        if ( items[ i ].ttl <= 0 ){
            return i
        }
    }
    return items.length
}
let last_event_num = 0
function event_num(){    
    last_event_num++
    return last_event_num
}
export function Game( { tellPlayer, tellScore } ) {
    tellScore = tellScore || ( _ => _ )
    const State = init_state()
    function init_score( idx ){
        return {
            total : 0,
            owner : idx,
        }
    }
    function give_points( idx, value ){
        let item = State.planes[ idx ]
        if ( item && item.score ){
            item.score.total += value
        }
    }
    // const inputs = []
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
            destroyed : item => item.as = 1,
            hitmaskf : Hitmaskfs.ox,
        }
    }
    function init_bird( i, l ){
        return {
            hitmaskf : Hitmaskfs.bird,
            x : Math.floor( 500 + Math.random() * 2000 ),
            y : Math.floor( 100 + ( i / l ) * 700 ),
            as : Math.floor( Math.random() * 2 ),
            interv : Math.floor( 3 + Math.random() * 2 ),
            step : 0,
            destroyed : item => item.ttl = -1
        }
    }
    function init_flock(i,l){
        return {
            hitmaskf : Hitmaskfs.flock,
            x : Math.floor( 500 + Math.random() * 2000 ),
            y : Math.floor( 100 + ( i / l ) * 500 ),
            as : Math.floor( Math.random() * 2 ),
            interv : Math.floor( 5 + Math.random() * 5 ),
            step : 0,
            destroyed : item => item.ttl = -1
        }
    }
    function init_ground(){
        return ground.map( x => x )
    }
    function init_debris( i, cs, x = 1600, y = 100 ){
        return {
            cs,
            x : x+Math.floor( Math.random()*50 ),
            y : y+Math.floor( Math.random()*50 ),
            a : ( (i*((Math.random()>0.5)?1:2)) % 16 ),
            dtype : ( i % 8 ),
        }
    }
    function init_explosion( cs ){
        return {
            cs,
            p : 4,
            ttl : -1,
            step : 0,
            debris : new Array(16).fill(0).map( (_,i) => {
                return init_debris( i, cs )
            }),
            
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
        }
        const targets = model.xs.map( (x,i) => {
            const as = model.tys[ i ]
            return {
                hitmaskf : Hitmaskfs.target,
                x,as,
                broken : false,
                destroyed : item => {
                    item.broken = true
                }
            }
        })
        return targets
    }
    function move_reload( reload ){
        if ( reload.step > 0  ){
            reload.step--
        }
    }
    function arm_reload( reload ){
        reload.step = reload.t
    }
    function init_plane(idx){
        return {
            cs : idx%ColorSchemes.length,
            hitmaskf : Hitmaskfs.plane,
            bhitmaskf : Bhitmaskfs.plane,
            idx,
            inputs : plane_init_inputs(),
            ttl : 300,
            inputId : undefined,
            x : 250 + idx * 250,
            y : 100,
            r : 0,
            a : 0,
            p : 2,
            reload : {
                t : 6,
                step : 0
            },
            bombs : new Array(8).fill(0).map( (_,i) => ({
                cs : idx%ColorSchemes.length,
                hitmaskf : Hitmaskfs.bomb,
                bhitmaskf : Bhitmaskfs.bomb,
                x : 1550+i*20,
                y : 100+i*10,
                a : i,
                p : 1,
                ttl : -1,
                step : 0,
                explosion : init_explosion(idx%ColorSchemes.length),
                owner : idx,
                destroys : ( me, other ) => {
                    if ( other.value ){
                        give_points( me.owner, other.value )
                        if ( other.idx !== undefined){
                            give_points( other.idx, -5 )
                        } else if ( other.owner !== undefined){
                            give_points( other.owner, -1 )
                        }
                    }
                },                
            })),
            missiles : new Array(16).fill(0).map( (_,i) => ({
                cs : idx%ColorSchemes.length,
                hitmaskf : Hitmaskfs.missile,
                bhitmaskf : Bhitmaskfs.missile,
                x : 1250+i*40,
                y : 100+i*10,
                a : i,
                p : 3,
                ttl : -1,
                step : 0,
                explosion : init_explosion(idx%ColorSchemes.length),
                owner : idx,
                destroys : ( me, other ) => {
                    if ( other.value ){
                        give_points( me.owner, other.value )
                        if ( other.idx !== undefined){
                            give_points( other.idx, -5 )
                        } else if ( other.owner !== undefined){
                            give_points( other.owner, -1 )
                        }
                    }
                },
            })),
            explosion : init_explosion(idx%ColorSchemes.length),
            falling : init_falling_plane(),
            leaving : init_leaving_plane(),
            respawn : -1,
            value : 10,
            score : init_score( idx )
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
            // pxcoll : { list : [] },
            version : 0,
            tree : new Tree( 4096, 1024, 16 ),
            showcolls : [],
            showtreecells : [],
        }
    }
    // const BombDropAngle = [0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8]
    const BombDropOffset = [[0,0]]
    const MissileDropOffset = [[0,0]]
    /*
      const NormalDirection16 = [0,1].map( r => directions16.map( (_,a) => {
      const v =  ( a + (r?4:12) ) % directions16.length
      console.log( a,r,directions16.length,v)
      return v
      })).reduce( (r,x) => Object.assign(r,x), {} )
    */
    function normalDirection16(r,a){
        return ( a + (r?4:12) ) % directions16.length
    }
    function fire_bomb_from_plane( bomb, from ){
        const { x, y, p, r, a } = from
        let off = BombDropOffset[ a % BombDropOffset.length]
        //let normal = NormalDirection16[ r * ( a + 1 )  ]
        let normal = normalDirection16(r,a)
        let dir = directions16[ normal ]
        const dist = 8                        
        bomb.x = x + off[0] + ( 16 / 2 ) - ( 8 / 2 ) + dir[0] * dist
        bomb.y = y + off[1] + ( 16 / 2 ) - ( 8 / 2 ) + dir[1] * dist
        bomb.p = clamp( p-2,1,2)
        bomb.ttl = 100
        bomb.step = 0
        bomb.a = a >> 1
        bomb.justFired = {
            type : 'bomb',
            num : event_num()
        }
    }
    function fire_missile_from_plane( missile, from ){
        const { x, y, p, r, a } = from
        let off = MissileDropOffset[ a % MissileDropOffset.length]
        //let normal = NormalDirection16[ r * ( a + 1 )  ]
        let normal = normalDirection16(r,a)
        let dir = directions16[ normal ]
        const dist = 8                        
        missile.x = x + off[0] + ( 16 / 2 ) - ( 8 / 2 ) + dir[0] * dist
        missile.y = y + off[1] + ( 16 / 2 ) - ( 8 / 2 ) + dir[1] * dist
        missile.ttl = 100
        missile.p = 5
        missile.step = 0
        missile.a = a 
        missile.justFired = {
            type : 'missile',
            num : event_num()
        }
    }
    function handleinputs(){
        State.planes.forEach( plane => {
            if ( plane.ttl >= 0 ){
                let inputs = plane.inputs
                let dda = 0
                let reverse = 0
                let dds = 0
                let firebomb = 0
                let firemissile = 0
                if ( inputs ){
                    dda = ( (inputs.noseup)?1:0 ) + ( (inputs.nosedown)?-1:0 )
                    dds = ( (inputs.powerup)?1:0 ) + ( (inputs.powerdown)?-1:0 )
                    reverse = inputs.reverse
                    firebomb = inputs.firebomb
                    firemissile = inputs.firemissile
                }
                const { x, y, r, a, p, bombs, missiles, reload } = plane
                plane.a = posmod( a + dda, 16 )
                plane.p = clamp( p + dds, 0, 4)
                if ( reverse ){
                    plane.r = r?0:1
                }
                if (firebomb){
                    if ( reload.step === 0 ){
                        let avail = available_ttl( bombs )
                        if ( avail !== bombs.length ){
                            fire_bomb_from_plane( bombs[avail], plane )
                            arm_reload( reload )
                        }
                    }
                }
                if (firemissile){
                    if ( reload.step === 0 ){
                        let avail = available_ttl( missiles )
                        if ( avail !== missiles.length ){
                            fire_missile_from_plane( missiles[avail], plane )
                            arm_reload( reload )
                        }
                    }
                }
            }
            plane_init_inputs( plane )
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
            if ( leaving.step && ( ( leaving.step % leaving.interv ) === 0 ) ){
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
                    // State.plane.r = !(State.plane.r)
                }
                plane.x = clamp( plane.x, worldSize.x1, worldSize.x2)
                plane.y = clamp( plane.y, worldSize.y1, worldSize.y2)
            } else {
                plane.respawn -= 1
                if ( plane.respawn < 0 ){
                    plane.ttl = 1000
                    plane.x = Math.floor( worldSize.x1 + worldSize.w * Math.random() )
                    plane.y = Math.floor( 100 + Math.floor( Math.random() * 700 ) )
                    plane.p = 1
                }
            }
            move_anim( leaving )
            move_anim( falling )
            if ( falling.ttl > 0 ){
                falling.y -= falling.p
            }
            move_explosion( explosion )
            ///

            move_reload( plane.reload )

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
                flock.x = Math.floor( flock.x + ( Math.random() * 2 ) - 0.5 )
                flock.y = Math.floor( flock.y + ( Math.random() * 2 ) - 0.5 )
            }
            flock.step++
        })
        State.birds.forEach( bird => {
            if ( ( bird.step % bird.interv ) === 0 ){
                bird.as = ( bird.as + 1)%2
                bird.x = Math.floor( bird.x + ( Math.random() * 4 ) - 1.5 )
                bird.y = Math.floor( bird.y + ( Math.random() * 4 ) - 1.2 )
            }
            bird.step++
        })

        ////////////
        
        /*
          State.targets.forEach( ox => {
          const { x } = ox
          const y = ground[ Math.floor( x ) % ground.length ]
          ox.y = y
          })*/
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
            let gheight = ground[ ( i + fx ) % ground.length ]
            let m = mask[ i ]
            if ( m < bhitmask.h ){
                let pheight = y + m
                if ( pheight <= gheight ){
                    //if ( State.pxcoll.list.length > 40000 ){
                    //State.pxcoll.list.shift()
                    //}
                    //State.pxcoll.list.push( [ i+fx, pheight,getRandomColor()] )
                    // modify ground
                    ground[ ( i + fx ) % ground.length ] = pheight
                    collides = true
                }
            }
        }
        return collides
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
        explosion.justFired = {
            type : 'explosion',
            num : event_num()
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
                // // explosion.debris.forEach( debri => f( 'debris', debri ) )
            })
            missiles.forEach( missile => {
                const { explosion } = missile
                f( 'missile', missile )
                // // explosion.debris.forEach( debri => f( 'debris', debri ) )
            })
        })
    }
    function collisions(){
        // State.tree = new Tree( 4096, 256, 16 )
        // to move ?
        State.oxs.forEach( ox => {
            ground_item16( ox )
            // ox.y = Math.random() * 200
            /* const { x } = ox
               const y = ground[ Math.floor( x ) % ground.length ]
               ox.y = y*/
        })
        State.targets.forEach( ox => {
            ground_item16( ox )
            /*const { x } = ox
              const y = ground[ Math.floor( x ) % ground.length ]
              ox.y = y*/
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
        iterateStateObjects( (type,item1) => {
            if ( ( item1.ttl !== undefined ) && ( item1.ttl < 0 ) ){
                return
            }
            // stats
            total++;
            const ct = c[ type ]
            c[ type ] = 1 + (ct?ct:0)
            // set hitmask
            const hitmask = item1.hitmaskf( item1 )
            item1._hitmask = hitmask
            // test ground
            if ( item1.ttl ){
                const bhitmask = item1.bhitmaskf( item1 )
                if ( bhitmask ){
                    const x = item1.x
                    const fx = Math.floor(x)
                    const y = item1.y
                    let collides = pixel_bottom_collision(fx,y,bhitmask) // modfies ground..
                    if ( collides ) {
                        if ( ! item1.undescrtu ) {
                            item1.ttl = -1
                            start_explosion( item1.explosion,fx ,y )
                            start_falling( item1 )
                        }
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
                        } else if ( ( item2.owner !== undefined ) && ( item1.idx !== undefined )){
                            dont = dont || ( item2.owner === item1.idx )
                        } else if ( ( item1.owner !== undefined ) && ( item2.owner !== undefined )){
                            dont = dont || ( item1.owner === item2.owner )
                        }
                        if ( (!dont) && rectangle_intersection( x,y,hitmask.w,hitmask.h,
                                                                item2.x,item2.y,hitmask2.w,hitmask2.h, o ) ){
                            State.showcolls.push( o )
                            if ( item1.value || item2.value ){
                                if ( item1.destroys || item2.destroys ){
                                    if ( item2.destroys ){
                                        /*console.log( (item1.destroys?'have':'no'), item1.cs,item1.value,
                                          '||',
                                          (item2.destroys?'have':'no'), item2.cs, item2.value )*/
                                        item2.destroys( item2, item1 )
                                    }
                                }
                            }
                            if ( item1.destroyed ) item1.destroyed( item1 )
                            if ( item2.destroyed ) item2.destroyed( item2 )
                            if ( item1.cs && item2.cs && ( item1.cs !== item2.cs ) ){
                                // console.log( item1.destroys, item2.destroys, item1.cs, item2.cs )
                                /*if ( item1.destroys ){
                                  console.log('here1',Date.now(),{item1,item2})
                                  }
                                  if ( item2.destroys ){
                                  console.log('here2',Date.now(),{item1,item2})
                                  }
                                  if ( item1.destroys ) item1.destroys( item1, item2 )
                                  if ( item2.destroys ) item2.destroys( item2, item1 )*/
                            }
                            //
                            if ( (!item1.undescrtu) && ( item1.ttl !== undefined ) ){
                                item1.ttl = -1
                            }
                            if ( (!item2.undescrtu) && ( item2.ttl !== undefined ) ){
                                item2.ttl = -1
                            }
                            //
                            if ( item1.destoys ) item1.destirt
                            if ( item1.explosion ) {
                                start_explosion( item1.explosion, x, y )
                            }
                            if ( item2.explosion ) {
                                start_explosion( item2.explosion, item2.x, item2.y )
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
    // function collisions2(){
    // State.version++
    // const version = State.version
    // const tree = State.tree
    // let ncoll = 0;
    // State.planes.forEach( plane => {
    // const { x, y, r, a, p, bombs, missiles, explosion } = plane
    // const { xs, tys, hits, broken } = State.targets
    // const ground = State.ground
    // /*
    // collisions with items
    // */
    // ;[ [ [ plane ], item => Hitmasks.plane[ (item.r)?1:0 ][ item.a ] ],
    // [ bombs, item => Hitmasks.bomb[ item.a ] ],
    // [ missiles, item => Hitmasks.missile[ item.a ] ]
    // ].forEach( ([ items, hitmaskf ]) => {
    // items.forEach( item => {
    // if (( item.ttl === undefined ) || (item.ttl > 0 )){
    // const explosion = item.explosion
    // const hitmask = hitmaskf( item )
    // const x = item.x
    // const y = item.y
    // tree.insert(
    // { x,y,w:hitmask.w,h:hitmask.h, item },
    // version,
    // () => { ncoll++ }
    // )
    // //const { x, y, r, a, p, explosion } = item //State.plane
    // for ( let i = 0 ; i < xs.length ; i++ ){
    // const tx = xs[ i ]
    // const ty = ground[ Math.floor( tx ) % ground.length ]
    // const hit = hits[ i ]
    // const ttype = tys[ i ] // type
    // const o = {}
    // if ( rectangle_intersection( x,y,hitmask.w,hitmask.h, tx,ty,16,16, o ) ){
    // if ( pixel_collision( o, x,y,hitmask.w,hitmask.h, hitmask, tx,ty,16,16, Hitmasks.targets[ ttype ]) ){
    // hits[ i ] = o
    // broken[ i ] = true
    // start_explosion( explosion, tx ,ty )
    // item.ttl = -1
    // start_falling( item )
    // }
    // } else {
    // //hits[ i ] = false
    // //broken[ i ] = false
    // }
    // }
    // }
    // })
    // })
    function ia(){
        function ia1( cp, target, maxdist ){
            //cp.undescrtu = true
            function pushButton( name ){
                cp.inputs[ name ] = true
            }
            //inputs.push( { input : 'nosedown', client : cp.idx } )
            let dist = Math.sqrt( Math.pow( target.x - cp.x, 2), Math.pow( target.y - cp.y, 2) )
            if ( dist < maxdist ){
                let dir = { x : target.x - cp.x, y : target.y - cp.y }
                let angle = Math.atan2( dir.y, dir.x )
                let a16 = ( 8 + Math.floor( 16 * ( angle + Math.PI )/ ( 2 * Math.PI ) ) ) % 16
                if ( a16 !== cp.a ){
                    // always up looping until right direction
                    //inputs.push( { input : 'noseup', client : cp.idx } )
                    cp.a = a16
                } else {
                    if ( Math.random() > 0.90 ) {
                        pushButton('firemissile')
                    }
                }
                if ( dist > 50 ){
                    pushButton('powerup')
                } else if ( dist > 25 ){
                    if ( cp.p < 3 ){
                        pushButton('powerup')
                    }
                } else if ( dist > 20 ) {
                    if ( cp.p > 10 ){
                        pushButton('powerdown')
                    }
                    pushButton('nosedown')
                } else {
                    if ( cp.p > 1 ){
                        pushButton('powerdown')
                    }
                }
            } else {
                pushButton('nosedown')
            }
        }
        let cp = State.planes[ 1 ]
        State.planes.forEach( ( p, i ) => {
            if ( p.inputId === undefined ){
                // if ( i > 0 ){
                // ia1( State.planes[ i ], State.planes[ i - 1 ] )
                if ( !(i%2) ){
                    ia1( State.planes[ i ], State.planes[ 0 ], 300)
                } else {
                    ia1( State.planes[ i ], State.planes[ i - 1 ],2000 )
                }
            }
        })
        // ia1( State.planes[ 0 ], State.planes[ State.planes.length - 1 ] )
        /*
          {
          let commands = [
          'noseup',
          //'nosedown',
          //'reverse',
          'powerup',
          //'firemissile',
          'firebomb'
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
        */
    }
    /*
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
      }*/
    function ground_item16( item ){
        const x = Math.floor( item.x )
        const ground = State.ground
        let meany = 0;
        let miny = Infinity
        for ( let ii = 0 ; ii < 16 ; ii++ ){
            let wx = x + ii
            let h = ground[ Math.floor( wx ) % ground.length ]
            // console.log( h )
            meany += h/16
            miny = Math.min( h, miny )
        }
        for ( let ii = 0 ; ii < 16 ; ii++ ){
            let wx = x + ii
            ground[ Math.floor( wx ) % ground.length ] = miny
        }
        item.y = miny
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
    // groundTargets()
    // groundOxs()
    // const FPS = 16//16//2//16
    function turninit_just_fired( x ){
        if ( x.justFired ){
            x.justFired = {}
        }
    }
    function turninit(){
        State.planes.forEach( ({ttl,bombs,missiles}) => {
            bombs.forEach( x => {
                turninit_just_fired( x )
                turninit_just_fired( x.explosion )
            })
            missiles.forEach( x => {
                turninit_just_fired( x )
                turninit_just_fired( x.explosion )
            })
        })
    }
    const FPS = 10//2//10//16//5
    State.lastUpdateTime = Date.now()
    function update(){
        const now = Date.now()
        //
        const dt = (now - State.lastUpdateTime) / 1000;
        let rfps = 1 / dt / FPS
        if ( ( rfps > 1.5 ) || ( rfps < 0.75 ) ){
            console.error( `update after ${ dt }s, should be ${ 1/FPS }s`,
                           `${ 1 / dt }fps, should be ${ FPS }fps `)
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
        turninit()
        ia()
        handleinputs()
        move()
        //}
        collisions()
        //groundTargets()
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
    const players = {
        names : () => Object.values( nameByInputId ),
        scores : () => Object.values( planeByInputId ).map( x => x.score.total ),
    }
    function addPlayer( inputId, name, total = 0 ){
        console.log('addPlayer', inputId, name, total )
        const plane = State.planes.find( x => x.inputId === undefined )
        if ( plane ){
            planeByInputId[ inputId ] = plane
            nameByInputId[ inputId ] = name || '?'
            plane.inputId = inputId
            plane.x = 500 + Math.floor( Math.random() * 1000 )
            plane.y = 100
            plane.p = 0
            plane.score = init_score( total )
            plane.score.total = total
            plane_init_inputs( plane )
            return true
        } else {
            return false
        }
    }
    function removePlayer( inputId ){
        const plane = planeByInputId[ inputId ]
        if ( plane ){
            const name = nameByInputId[ inputId ]
            tellScore( name, plane.score )
            delete planeByInputId[ inputId ]
            delete nameByInputId[ inputId ]
            plane.inputId = undefined
            plane_init_inputs( plane )
        }
    }
    function plane_init_inputs( plane = {} ){
        let inputs = plane.inputs
        if ( ! inputs ){
            inputs = {}
            plane.inputs = inputs
        }
        PLANE_INPUT_NAMES.forEach( name => {
            inputs[ name ] = false
        })
        return inputs
    }
    function plane_handle_input( plane, input ){
        if ( plane.inputs ){
            plane.inputs[ input ] = true
        }
        /*inputs.push({
          input,
          client : State.planes.findIndex( p => plane === p )
          })*/
    }
    function handleInput( inputId, input ){
        let plane = planeByInputId[ inputId ]
        if ( plane ){
            plane_handle_input( plane, input )
        }
    }
    const leaderboardskip = {
        ttl : 0,
        reset : 10
    }
    function stateUpdated(){
        let now = Date.now()
        let doLeaderboard = false
        if ( leaderboardskip.ttl === 0 ){
            doLeaderboard = true
            leaderboardskip.ttl = leaderboardskip.reset
        } else {
            leaderboardskip.ttl -= 1
        }
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
            leaderboard : [],
            //showcolls : State.showcolls,
            //showtreecells : State.showtreecells,
        }
        if ( doLeaderboard ) {
            // no every time
            State.planes.forEach( plane => {
                if ( plane.inputId ){
                    const username = nameByInputId[ plane.inputId ]
                    payload.leaderboard.push( { username, score : plane.score.total } )
                }
            })
        } else {
            payload.leaderboard = undefined
        }
        State.targets.forEach( target => {
            let { x, y, as, broken } = target
            payload.targets.push( { x, y, as, broken } )
        })
        State.flocks.forEach( flock => {
            let { x, y, as } = flock
            if ( ( flock.ttl === undefined ) || ( flock.ttl > 0 ) ){
                payload.flocks.push( { x, y, as } )
            }
        })
        State.birds.forEach( bird => {
            let { x, y, as, ttl } = bird
            if ( ( bird.ttl === undefined ) || ( bird.ttl > 0 ) ){
                payload.birds.push( { x, y, as } )
            }
        })
        State.oxs.forEach( ox => {
            let { x, y, as } = ox
            payload.oxs.push( { x, y, as } )
        })
        State.planes.forEach( plane => {
            let { ttl, x, y, r, a, p, cs, explosion, leaving, falling } = plane
            let name = '??'
            if ( plane.inputId ){
                name = nameByInputId[ plane.inputId ]
            }
            // TODO
            //if ( ttl > 0 ){
            payload.planes.push( { ttl, x, y, r, a, p, cs, name } )
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
                    let { x,y,justFired } = explosion
                    payload.explosions.push( { x,y,justFired } )
                    explosion.debris.forEach( debri => {
                        let { x, y, a, dtype, cs } = debri
                        payload.debris.push( { x, y, a, dtype, cs } )
                    })
                }
                plane.bombs.forEach( bomb => {
                    let { x, y, a, p, cs, ttl, step, explosion, justFired } = bomb
                    payload.bombs.push( { x, y, a, p, cs, ttl, justFired /*, step */ } )
                    if ( explosion.ttl > 0 ){
                        let { x,y,justFired } = explosion
                        payload.explosions.push( { x,y,justFired } )

                        explosion.debris.forEach( debri => {
                            let { x, y, a, cs, dtype } = debri
                            payload.debris.push( { x, y, a, cs, dtype } )
                        })
                    }
                })
                plane.missiles.forEach( missile => {
                    let { x, y, a, p, cs, ttl, step, explosion, justFired } = missile
                    payload.missiles.push( { x, y, a, p, cs, ttl, justFired /*, step */ } )
                    if ( explosion.ttl > 0 ){
                        let { x,y,justFired } = explosion
                        payload.explosions.push( { x,y,justFired } )

                        explosion.debris.forEach( debri => {
                            let { x, y, a, dtype } = debri
                            payload.debris.push( { x, y, a, cs, dtype } )
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
            tellPlayer( inputId, Object.assign( { me } , payload ) )
        })
    }
    gameloop()
    return {
        addPlayer,
        removePlayer,
        handleInput,
        players,
    }
}
