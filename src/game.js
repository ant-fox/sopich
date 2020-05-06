const IA_DOES_NOT_FIRE = false
const IA_JUST_FLIES_AROUND = false
const FIRST_PLANE_CANNOT_BE_DESTRUCTED = false
const MAX_PLANES = 10
const IDLE_IF_NO_PLAYER = true
const DEBUG_MESSAGES = true
//
// Mode campagne :

// sauvegarder {
// highscore des surivals
// unlocks
// }
//
//
// ?? mode easy / hard
//
//
// mission:tutoriel1 -> mission:tutoriel2 -> mission:tutoriel3
// -> pas de choix de mission
//
// sv:mission 1 'kill five cows' 
// sv:mission 2 'protect forts pendant un certain temps'
//
// - 2 survival modes
//   tuer jusqu'à mourrir -> MORT
//   défendre les forts jusqu'à plus de fort  -> MORT
//
// mode campagne
// - survivre 5 minutes.
//   => survit et +50 points --> unlock NEXT
// - 

// game modes
// - protect fort
// evenly spaced hq along x must be protected by same color plane
// base destruction -> -200
// - solo battle [survival-master] unlock 
// (normal count)
// - solo contest
//   -> limited time (max score)
//   -> limited score (min time)
// - by team
// like protect fort but with less hq types than players
//
// - invasion
// all forts belong to A team
// A team must destroy all opponent (n lives ?)
// B team must destroy all building
//
// - prime hunting
// value for shooting plane <- score.total
//
// bird + flock use anim
// timeout before beeing killable when respawning
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
import { rectangle_intersection, rectangle_intersection_bool } from './rect.js'
import { ColorSchemes } from './symbols.js'
import { NameGenerator } from './misc/namegenerator.js'
import { ia } from './cipiu.js'
import { default as boxIntersect } from 'box-intersect'

function debugMessage( ...p ){
    if ( DEBUG_MESSAGES ){
        console.log('[sopich game]',...p)
    }
}

export const worldSize = {
    x1 : 0,
    x2 : 3000,
    y1 : 0,
    y2 : 800,
    w : 3000,
    h : 800
}
export const ADD_PLAYER_RETURNS = {
    OK : 0,
    WRONG_USERNAME : 1,
    ALREADY_JOINED : 2,
    USERNAME_TOO_LONG : 3,
    NO_MORE_AVAILABLE_ITEM : 4,
    USERNAME_ALREADY_IN_USE : 5
}
export const PLANE_INPUT_NAMES = [
    'noseup','nosedown','reverse',
    'powerup','powerdown',
    'firebomb','firemissile','fireguidedmissile',
]
const generateName = NameGenerator()
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
    guidedmissile : item => Hitmasks.missile[ item.a ],
    flock : item => Hitmasks.flock[ item.as ],
    bird : item => Hitmasks.bird[ item.as ],
    target : item => ((item.broken)
                      ?(Hitmasks.target_hit)
                      :(Hitmasks.targets[ item.as ])),
    ox : item => Hitmasks.ox[ item.as ],
    debris : item => Hitmasks.ox[ 0 ], // TODO
}
const Bhitmaskfs = {
    plane : item => BottomHitmasks.plane[ (item.r)?1:0 ][ item.a ],
    bomb : item => BottomHitmasks.bomb[ item.a ],
    missile : item => BottomHitmasks.missile[ item.a ],
    guidedmissile : item => BottomHitmasks.missile[ item.a ],
    debris : item => BottomHitmasks.ox[ 0 ], // TODO
}
function available_ttl( items ){
    // get first dead item in a list
    for ( let i = 0, l = items.length ; i < l ; i++ ){
        if ( items[ i ].ttl <= 0 ){
            return i
        }
    }
    return undefined
}
let last_event_num = 0
function event_num(){    
    last_event_num++
    return last_event_num
}

export function Game( { tellPlayer, // called with user centered world, each world update 
                        tellScore,  // called with player score, when quitting
                      } ) {
    
    let _itemId = 0
    function newItemId(){
        return _itemId++
    }
    function newItem( item ){
        item.id = newItemId()
        return item
    }
    
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
            item.value += Math.max( 0, Math.floor( value/2 ) )
        }
    }
    function init_justfired( type ){
        return newItem({
            type,
            num : undefined,
            ttl : -1,
        })
    }
    function init_falling_plane(idx,cs){
        return newItem({
            cs,idx,
            x : Math.floor( 100 + Math.random() * 2500 ),
            y : Math.floor( 100 + Math.random() * 200 ),
            step : 0,
            len : 2,
            dir : 1,
            loop : true,
            interv : 8,
            ttl : -1,
            as : 0,
            p : 3,
        })
    }
    function init_leaving_plane(idx,cs){
        return newItem({
            cs,idx,
            x : Math.floor( 100 + Math.random() * 2500 ),
            y : Math.floor( 100 + Math.random() * 200 ),
            step : 3,
            len : 4,
            dir : -1,
            loop : false,
            interv : 15,
            ttl : -1,
            as : 3,
        })
    }
    function init_ox( i , l ){
        return newItem({
            x : Math.floor( 400 + ( i / l ) * 2000 ),
            as : 0,
            destroyed : item => item.as = 1,
            hitmaskf : Hitmaskfs.ox,
        })
    }
    function init_bird( i, l ){
        return newItem({
            x : Math.floor( 500 + Math.random() * 2000 ),
            y : Math.floor( 100 + ( i / l ) * 700 ),
            as : Math.floor( Math.random() * 2 ),
            interv : Math.floor( 3 + Math.random() * 2 ),
            step : 0,
            hitmaskf : Hitmaskfs.bird,
            destroyed : item => item.ttl = -1
        })
    }
    function init_flock(i,l){
        return newItem({
            x : Math.floor( 500 + Math.random() * 2000 ),
            y : Math.floor( 100 + ( i / l ) * 500 ),
            as : Math.floor( Math.random() * 2 ),
            interv : Math.floor( 5 + Math.random() * 5 ),
            step : 0,
            hitmaskf : Hitmaskfs.flock,
            destroyed : item => item.ttl = -1
        })
    }
    function init_ground(){
        return ground.map( x => x )
    }
    function init_debris( i, cs, x = 1600, y = 100 ){
        return newItem({
            cs,
            x : x+Math.floor( Math.random()*50 ),
            y : y+Math.floor( Math.random()*50 ),
            a : ( (i*((Math.random()>0.5)?1:2)) % 16 ),
            hitmaskf : Hitmaskfs.debris,
            dtype : ( i % 8 ),
        })
    }
    function init_explosion( cs ){
        return newItem({
            x : 0,
            y : 0,
            cs,
            p : 4,
            ttl : -1,
            step : 0,
            debris : new Array(16).fill(0).map( (_,i) => {
                return init_debris( i, cs )
            }),
            justfired : init_justfired('explosion')
        })
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
            return newItem({
                hitmaskf : Hitmaskfs.target,
                x,as,
                broken : false,
                destroyed : item => {
                    item.broken = true
                }
            })
        })
        return targets
    }
    
    function init_reload( t, o = {} ){
        return Object.assign( o, { t, step : 0 } )
    }
    function move_reload( reload ){
        if ( reload.step > 0  ){
            reload.step--
        }
    }
    function reload_is_reloaded( reload ){
        return ( reload.step === 0 )
    }
    function arm_reload( reload ){
        reload.step = reload.t
    }

    function init_bomb( i, owner ){
        const idx = owner
        return newItem({
            age : 0,
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
            justfired : init_justfired('bomb')
        })
    }
    function init_missile( i, owner ){
        const idx = owner
        return newItem({
            age : 0,
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
            justfired : init_justfired('missile')
        })
    }
    function init_guidedmissile( i, owner ){
        const missile = init_missile( i, owner )
        missile.guidanceTarget = undefined
        missile.p = 4
        return missile
    }

    function init_plane(idx){
        const cs = idx%ColorSchemes.length
        return newItem({
            age : 0,
            recklessness : 40,
            cs,
            hitmaskf : Hitmaskfs.plane,
            bhitmaskf : Bhitmaskfs.plane,
            idx,
            inputs : plane_init_inputs(),
            ttl : 1,
            inputId : undefined,
            x : 250 + idx * 250,
            y : 100,
            r : 0,
            a : 0,
            p : 2,
            reload : init_reload( 6 ),
            bombs : new Array(8).fill(0).map( (_,i) => init_bomb( i, idx ) ),
            missiles : new Array(16).fill(0).map( (_,i) => init_missile( i, idx ) ),
            guidedmissiles : new Array(1).fill(0).map( (_,i) => init_guidedmissile( i, idx ) ),
            explosion : init_explosion(idx%ColorSchemes.length),
            falling : init_falling_plane(idx,cs),
            leaving : init_leaving_plane(idx,cs),
            respawn : -1,
            value : 10,
            score : init_score( idx ),
            defaultname : generateName()
        })
    }
    function init_state(){
        return {
            version : 0,
            ground : init_ground(),
            planes : new Array(MAX_PLANES).fill(0).map( (_,i) => init_plane(i) ),
            targets : init_targets(),
            birds : new Array(20).fill(0).map( (_,i,r) => init_bird(i,r.length) ),
            flocks : new Array(4).fill(0).map( (_,i,r) => init_flock(i,r.length) ),
            oxs : new Array(12).fill(0).map( (_,i,r) => init_ox(i,r.length) ),
            // pxcoll : { list : [] },
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
      debugMessage( a,r,directions16.length,v)
      return v
      })).reduce( (r,x) => Object.assign(r,x), {} )
    */
    function normalDirection16(r,a){
        return ( a + (r?4:12) ) % directions16.length
    }
    function justfire( justfired ){
        // justfired.type = type
        justfired.ttl = 1
        justfired.num = event_num()
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
        bomb.age = 0
        newItem( bomb )
        justfire( bomb.justfired )
    }
    function fire_guidedmissile_from_plane( missile, from ){
        fire_missile_from_plane( missile, from )
        missile.ttl = 80
        missile.guidanceTarget = undefined
        missile.p = 5
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
        missile.age = 0
        justfire( missile.justfired )
        newItem( missile )
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
                let fireguidedmissile = 0
                if ( inputs ){
                    dda = ( (inputs.noseup)?1:0 ) + ( (inputs.nosedown)?-1:0 )
                    dds = ( (inputs.powerup)?1:0 ) + ( (inputs.powerdown)?-1:0 )
                    reverse = inputs.reverse
                    firebomb = inputs.firebomb
                    firemissile = inputs.firemissile
                    fireguidedmissile = inputs.fireguidedmissile
                }
                const { x, y, r, a, p, bombs, missiles, guidedmissiles, reload } = plane
                plane.a = posmod( a + dda, 16 )
                plane.p = clamp( p + dds, 0, 4)
                if ( reverse ){
                    plane.r = r?0:1
                }
                const tooyoung = ( plane.age < plane.recklessness )
                if (!tooyoung){
                    if (firebomb){
                        if ( reload_is_reloaded( reload ) ){
                            let avail = available_ttl( bombs )
                            if ( avail !== undefined ){
                                fire_bomb_from_plane( bombs[avail], plane )
                                arm_reload( reload )
                            }
                        }
                    }
                    if (firemissile){
                        if ( reload_is_reloaded( reload ) ){
                            let avail = available_ttl( missiles )
                            if ( avail !== undefined ){
                                fire_missile_from_plane( missiles[avail], plane )
                                arm_reload( reload )
                            }
                        }
                    }
                    if (fireguidedmissile){
                        if ( reload_is_reloaded( reload ) ){
                            let avail = available_ttl( guidedmissiles )
                            if ( avail !== undefined ){
                                fire_guidedmissile_from_plane( guidedmissiles[avail], plane )
                                arm_reload( reload )
                            }
                        }
                    }
                }
            }
            // reset inputs
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
                debris.ttl = explosion.ttl
            }
            explosion.ttl -= 1
        }
    }
    function move_anim( leaving ){
        const { ttl, step, interv, as, dir, len, loop } = leaving
        if ( ttl > 0 ){
            if ( step && ( ( step % interv ) === 0 ) ){
                if ( loop ){
                    leaving.as = posmod( as + dir, len )
                } else {
                    let next_as = as + dir
                    if ( next_as < 0 ){
                        leaving.ttl = -1
                    } else {
                        leaving.as = clamp( as + dir, 0, len )
                    }
                }
            }
            leaving.step++
            leaving.ttl--
        }
    }
    function move_plane( plane ){
        // const { x, y, r, a, p, bombs, missiles, guidedmissiles, explosion, leaving, falling } = plane
        let dx, dy
        if ( plane.p === 0 ){
            dx = 0
            dy = -3
        } else {
            dx = directions16[ plane.a ][ 0 ] * plane.p * 2
            dy = directions16[ plane.a ][ 1 ] * plane.p * 2
        }
        if ( plane.ttl >= 0 ){
            plane.x = plane.x + dx
            plane.y = plane.y + dy
            if ( plane.y > worldSize.y2 ){ // TODO
                plane.a = 12
                // State.plane.r = !(State.plane.r)
            }
            if ( plane.x < worldSize.x1 ){
                plane.a = 0
                plane.r = 0
            }
            if ( plane.x > worldSize.x2 ){
                plane.a = 8
                plane.r = 1
            }
            plane.x = clamp( plane.x, worldSize.x1, worldSize.x2)
            plane.y = clamp( plane.y, worldSize.y1, worldSize.y2)
            plane.age+= 1
        } else {
            plane.respawn -= 1                
            if ( plane.respawn < 0 ){
                newItem( plane )
                plane.ttl = 1
                plane.x = Math.floor( worldSize.x1 + worldSize.w * Math.random() )
                plane.y = Math.floor( 400 + Math.floor( Math.random() * 400 ) )
                plane.p = 2
                plane.age = 0
            }
        }

    }
    function move_bomb( bomb ){
        const { x, y, a, p, ttl, step } = bomb
        let dx = directions8[ a ][ 0 ] * p * 2
        let dy = directions8[ a ][ 1 ] * p * 2
        bomb.x = x + dx
        bomb.y = y + dy                    
        if ( step === 20 ){
            // every 20 step
            bomb.step = 0
            bomb.a = toFall8[ a ]
        } else {
            bomb.step += 1
        }
        bomb.ttl -= 1
        bomb.age += 1

    }
    function move_missile( missile ){
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
        missile.age += 1
    }
    function move_guidedmissile( guidedmissile ){
        const { age, x, y, p, ttl, step, owner } = guidedmissile
        const plane = State.planes[ owner ]
        function nearestActivePlane(x,y,self){
            let sqDist = Number.POSITIVE_INFINITY
            let targetPlane = undefined
            for ( let i = 0 ; i < State.planes.length ; i++ ){
                const oplane = State.planes[ i ]
                if (( oplane !== self ) && ( oplane.ttl > 0 )){
                    const d = Math.pow( x - oplane.x,2 ) + Math.pow( y - oplane.y,2 ) 
                    if ( d < sqDist ){
                        targetPlane = oplane
                        sqDist = d
                    }
                }
            }
            return targetPlane
        }
        
        if ( age > 10 && ( ( step % 4 ) === 0 ) ){
            //if (( !guidedmissile.guidanceTarget ) || ( guidedmissile.guidanceTarget.ttl <= 0 ) ){
            const nap = nearestActivePlane(x,y,plane)
            guidedmissile.guidanceTarget = nap
            //    }
        }
        function shortestsRotationDirection( from16, to16 ){
            if ( from16 === to16 ) return 0
            for ( let i = 1 ; i < 8 ; i++ ){
                const r16 = ( from16 + i ) % 16
                if ( r16 === to16 ){
                    return 1
                }
            }
            return -1
        }
        const { guidanceTarget } = guidedmissile
        if ( ( step%3 ) === 0 ){
            if ( guidanceTarget ){
                const dir = { x : guidanceTarget.x - x, y : guidanceTarget.y - y }
                let angle = Math.atan2( dir.y, dir.x )
                let a16 = ( 8 + Math.floor( 16 * ( angle + Math.PI )/ ( 2 * Math.PI ) ) ) % 16
                const { a } = guidedmissile
                
                const rot16 = shortestsRotationDirection( guidedmissile.a, a16 )
                //if ( Math.abs( rot16 < 4 ) ){
                //guidedmissile.a = (16 + guidedmissile.a + Math.sign( rot16 ) )%16
                guidedmissile.a = (16 + guidedmissile.a + rot16  )%16
                //}

            }
        }

        const  { a } = guidedmissile
        let dx = directions16[ a ][ 0 ] * p * 2
        let dy = directions16[ a ][ 1 ] * p * 2
        guidedmissile.x = x + dx
        guidedmissile.y = y + dy
        
        if ( step === 20 ){
            guidedmissile.step = 0
            //guidedmissile.a = toFall8[ a ]
        } else {
            guidedmissile.step += 1
        }
        guidedmissile.ttl -= 1
        guidedmissile.age += 1
    }
    function move_flock( flock ){
        if ( ( flock.step % flock.interv ) === 0 ){
            flock.as = ( flock.as + 1)%2
            flock.x = Math.floor( flock.x + ( Math.random() * 2 ) - 0.5 )
            flock.y = Math.floor( flock.y + ( Math.random() * 2 ) - 0.5 )
        }
        flock.step++
        
    }
    function move_bird( bird ){
        if ( ( bird.step % bird.interv ) === 0 ){
            bird.as = ( bird.as + 1)%2
            bird.x = Math.floor( bird.x + ( Math.random() * 4 ) - 1.5 )
            bird.y = Math.floor( bird.y + ( Math.random() * 4 ) - 1.2 )
        }
        bird.step++
    }
    
    function move(){
        State.planes.forEach( plane => {
            const { x, y, r, a, p, bombs, missiles, guidedmissiles, explosion, leaving, falling } = plane
            move_plane( plane )
            move_anim( leaving )
            move_anim( falling )
            if ( falling.ttl > 0 ){
                falling.y -= falling.p
            }
            move_explosion( explosion )
            move_reload( plane.reload )
            
            for ( let i = 0, l = bombs.length ; i < l ; i++ ){
                const bomb = bombs[i]
                if ( bomb.ttl <= 0 ){
                } else {
                    move_bomb( bomb )
                }
                //const explosion = bomb.explosion
                move_explosion( bomb.explosion )
            }
            for ( let i = 0, l = missiles.length ; i < l ; i++ ){
                const missile = missiles[i]
                if ( missile.ttl <= 0 ){
                } else {
                    move_missile( missile )
                }
                move_explosion( missile.explosion )
            }
            for ( let i = 0, l = guidedmissiles.length ; i < l ; i++ ){
                const guidedmissile = guidedmissiles[i]
                
                if ( guidedmissile.ttl <= 0 ){
                } else {
                    move_guidedmissile( guidedmissile )
                }
                move_explosion( guidedmissile.explosion )
            }
        })
        State.flocks.forEach( flock => {
            move_flock( flock )
        })
        State.birds.forEach( bird => {
            move_bird( bird )
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
        explosion.x = x
        explosion.y = y
        newItem( explosion )
        const debris = explosion.debris
        for ( let j = 0, ll = debris.length ; j < ll ; j++ ){
            const debri = debris[ j ]
            debri.x = x
            debri.y = y
            newItem( debri )
        }
        justfire( explosion.justfired )
    }
    function start_falling( item ){
        if ( item.falling ){
            // TODO
            item.falling = init_falling_plane( item.falling.idx, item.falling.cs )
            item.falling.x = item.x
            item.falling.y = item.y
            item.falling.ttl = 100
        }
        if ( item.respawn ){
            item.respawn = 20
        }
    }
    function iterateCollisionItems( f ){
        //f( 'ground', State.ground )
        State.oxs.forEach( ox => f( 'ox', ox ) )
        State.targets.forEach( (target,i) => f( 'target', target ) )
        // State.birds.forEach( bird => f( 'bird', bird ) )
        // State.flocks.forEach( flock => f( 'flock', flock ) )
        State.planes.forEach( plane => {
            const { bombs, missiles, guidedmissiles, explosion } = plane
            f( 'plane', plane )
            explosion.debris.forEach( debri => f( 'debris', debri ) )
            bombs.forEach( bomb => {
                const { explosion } = bomb
                f( 'bomb', bomb )
               // explosion.debris.forEach( debri => f( 'debris', debri ) )
            })
            missiles.forEach( missile => {
                const { explosion } = missile
                f( 'missile', missile )
                //                explosion.debris.forEach( debri => f( 'debris', debri ) )
            })
            guidedmissiles.forEach( missile => {
                const { explosion } = missile
                f( 'guidedmissile', missile )
                //explosion.debris.forEach( debri => f( 'debris', debri ) )
            })
        })
    }
    function resolve_collision( item1, item2 ){
        // both die

        
        //          same  team                    other team                  no team
        //          bomb  missile plane building  bomb missile plane buildin  flock bird
        // bomb     
        // missile       
        // plane
        // building 
        // flock
        // bird
        
        
        if ( item1.destroys ) item1.destroys( item1, item2 )
        if ( item2.destroys ) item2.destroys( item2, item1 )

        if ( item1.destroyed ) item1.destroyed( item1 )
        if ( item2.destroyed ) item2.destroyed( item2 )
        
        //
        if ( (!item1.undescrtu) && ( item1.ttl !== undefined ) ){
            item1.ttl = -1
        }
        if ( (!item2.undescrtu) && ( item2.ttl !== undefined ) ){
            item2.ttl = -1
        }
        //
        // ? if ( item1.destoys ) item1.destirt
        if ( item1.explosion ) {
            start_explosion( item1.explosion, item1.x, item2.y )
        }
        if ( item2.explosion ) {
            start_explosion( item2.explosion, item2.x, item2.y )
        }
        if ( item1.falling ) start_falling( item1 )
        if ( item2.falling ) start_falling( item2 )

        
    }
    function have_ownership_relation( item1, item2 ){
        let dont = false
        if ( ( item1.owner !== undefined ) && ( item2.idx !== undefined )){
            dont = item1.owner === item2.idx
        } else if ( ( item2.owner !== undefined ) && ( item1.idx !== undefined )){
            dont = dont || ( item2.owner === item1.idx )
        } else if ( ( item1.owner !== undefined ) && ( item2.owner !== undefined )){
            dont = dont || ( item1.owner === item2.owner )
        }
        return dont
    }
    function have_sameteam_relation( item1, item2 ){
        if ( item1.cs ) return
        if ( item2.cs ) return
        return ( item1.cs === item2.cs )
    }
    function groundCollision(){

        iterateCollisionItems( (type,item1) => {
            if ( ( item1.ttl !== undefined ) && ( item1.ttl < 0 ) ){
                return
            }
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
        })
        
    }
    
    function collisions(){
        
        
        // ground items
        State.oxs.forEach( ox => {
            ground_item16( ox )
        })
        State.targets.forEach( ox => {
            ground_item16( ox )
        })

        // collide with ground
        groundCollision()

        // object collisions
        
        // build list
        const collisionsItems = []
        const boundingBoxes = []
        iterateCollisionItems( (type,item) => {

            if ( item.ttl <= 0 )
                return

            const tooYoungtoDie = ( item.age && item.recklessness
                                    && ( item.age < item.recklessness ) )

            if ( tooYoungtoDie )
                return
            
            const hitmask = item.hitmaskf( item ),
                  { x, y } = item,
                  { w, h } = hitmask,
                  dims = [ x, y, x + w, y + h ]
            
            collisionsItems.push( { type, item } )
            boundingBoxes.push( dims )
            
        })
        // get rectangle intersections
        const mes = { start : Date.now() }
        const intersections = boxIntersect( boundingBoxes )
        mes.end = Date.now()
//        console.log('collide took', mes.end - mes.start )
        intersections.forEach( ([i1,i2]) => {

            const ci1 = collisionsItems[ i1 ],
                  ci2 = collisionsItems[ i2 ],
                  item1 = ci1.item,
                  type1 = ci1.type,
                  item2 = ci2.item,
                  type2 = ci2.type
            
            const dont = have_ownership_relation( item1, item2 )
            if ( dont )
                return

            const PIXEL_COLLISION = false
            if ( PIXEL_COLLISION ){
                // rectangle_intersection ->
                if (pixel_collision( o, x,y,hitmask.w,hitmask.h, hitmask,
                                     tx,ty,16,16, Hitmasks.targets[ ttype ]) ){
                    resolve_collision( item1, item2 )
                }
            } else {
                resolve_collision( item1, item2 )
            }

        })
    }
  
    function ground_item16( item ){
        const x = Math.floor( item.x )
        const ground = State.ground
        let meany = 0;
        let miny = Infinity
        for ( let ii = 0 ; ii < 16 ; ii++ ){
            let wx = x + ii
            let h = ground[ Math.floor( wx ) % ground.length ]
            // debugMessage( h )
            meany += h/16
            miny = Math.min( h, miny )
        }
        for ( let ii = 0 ; ii < 16 ; ii++ ){
            let wx = x + ii
            ground[ Math.floor( wx ) % ground.length ] = miny
        }
        item.y = miny
    }   

    function turninit_justfired( x ){
        if ( x.justfired ){
            x.justfired.ttl = -1
        }
    }
    function turninit(){
        State.planes.forEach( ({ttl,bombs,missiles,guidedmissiles}) => {
            bombs.forEach( x => {
                turninit_justfired( x )
                turninit_justfired( x.explosion )
            })
            missiles.forEach( x => {
                turninit_justfired( x )
                turninit_justfired( x.explosion )
            })
            guidedmissiles.forEach( x => {
                turninit_justfired( x )
                turninit_justfired( x.explosion )
            })
        })
    }
    // const FPS = 16//16//2//16
    const FPS = 10//2//10//16//5

    State.lastUpdateTime = Date.now()
    function update(){
        const nplayers = Object.keys( playerByInputId ).length
        if ( IDLE_IF_NO_PLAYER && ( nplayers === 0 )){
            return
        }
        
        const now = Date.now()
        //
        const dt = (now - State.lastUpdateTime) / 1000;
        let rfps = 1 / dt / FPS
        if ( ( rfps > 1.5 ) || ( rfps < 0.75 ) ){
            debugMessage( `update after ${ dt }s, should be ${ 1/FPS }s`,
                           `${ 1 / dt }fps, should be ${ FPS }fps `)
        }
      
        turninit()
        ia(State,{ IA_DOES_NOT_FIRE, IA_JUST_FLIES_AROUND } )
        handleinputs()
        move()
        const mes = { start : Date.now() }
        collisions()
        mes.end = Date.now()
//        console.log('total for collisions',mes.end - mes.start )
        stateUpdated()
        State.lastUpdateTime = now;

        State.version++
    }
    function gameloop(){
        setInterval( update, 1000/FPS)
    }
    
    /*
     * Players
     */
    const players = {
        names : () => Object.values( playerByInputId ).map( x => x.name ),
        scores : () => Object.values( playerByInputId ).map( x => x.plane.score.total )
    }
    const playerByInputId = {}
    function addPlayer( inputId, name, initialScore = 0 ){

        debugMessage('try add player',inputId,name,initialScore)
        //debugMessage('[game]',playerByInputId[ inputId ].idx)

        
        if ( playerByInputId[ inputId ] ) return ADD_PLAYER_RETURNS.ALREADY_JOINED
        if ( typeof name !== 'string' ) return ADD_PLAYER_RETURNS.WRONG_USERNAME
        if ( name.length > 20 ) return ADD_PLAYER_RETURNS.USERNAME_TOO_LONG

        let nameExists = Object.values( playerByInputId ).find( p => p.name ===  name )
        if ( nameExists ) return ADD_PLAYER_RETURNS.USERNAME_ALREADY_IN_USE
        
        debugMessage('add player', inputId, name, initialScore )
        
        const plane = State.planes.find( x => x.inputId === undefined )
        if ( plane ){
            playerByInputId[ inputId ] = {
                plane,
                name : ( name || ('anon#'+event_num()) )
            }
            plane.inputId = inputId
            plane.x = 500 + Math.floor( Math.random() * 1000 )
            plane.y = 100
            plane.p = 1
            plane.a = 0
            plane.score = init_score( initialScore )
            plane.score.total = initialScore
            plane_init_inputs( plane )
            return ADD_PLAYER_RETURNS.OK
        } else {
            return ADD_PLAYER_RETURNS.NO_MORE_AVAILABLE_ITEM
        }
    }
    function removePlayer( inputId ){
        /* */
        const player = playerByInputId[ inputId ]
        if ( !player ) return

        const plane = player.plane
        if ( plane ){
            const name = player.name
            tellScore( name, plane.score )
            delete playerByInputId[ inputId ]
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
    }
    function handleInput( inputId, input ){
        let player = playerByInputId[ inputId ]
        if (!player) return
        let plane = player.plane
        if ( plane ){
            plane_handle_input( plane, input )
        }
    }

    const leaderboardskip = {
        ttl : 0,
        reset : 10
    }
    // build message for visualisation
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
            justfired : [],
            planes : [],
            explosions : [],
            bombs : [],
            missiles : [],
            guidedmissiles : [],
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
                    const player = playerByInputId[ plane.inputId ]
                    if ( player ){
                        const username = player.name 
                        payload.leaderboard.push( { username, score : plane.score.total } )
                    }
                }
            })
        } else {
            payload.leaderboard = undefined
        }
        State.targets.forEach( target => {
            let { id, x, y, as, broken } = target
            payload.targets.push( { id, x, y, as, broken } )
        })
        State.flocks.forEach( flock => {
            let { id, x, y, as } = flock
            if ( ( flock.ttl === undefined ) || ( flock.ttl > 0 ) ){
                payload.flocks.push( { id, x, y, as } )
            }
        })
        State.birds.forEach( bird => {
            let { id, x, y, as, ttl } = bird
            if ( ( bird.ttl === undefined ) || ( bird.ttl > 0 ) ){
                payload.birds.push( { id, x, y, as } )
            }
        })
        State.oxs.forEach( ox => {
            let { id, x, y, as } = ox
            payload.oxs.push( { id, x, y, as } )
        })
        
        State.planes.forEach( plane => {
            let { id,
                  defaultname,
                  age,
                  idx, ttl, x, y, r, a, p, cs, explosion, leaving,
                  falling, value, score,
                  recklessness,
                } = plane
            let name = '??'
            let human = false
            if ( plane.inputId ){
                const player = playerByInputId[ plane.inputId ]
                if ( player && player.name ){
                    name = player.name
                    human = true
                }
            } else {
                if ( defaultname )  {
                    name = defaultname
                }
            }

            const reckless = ( age < recklessness )

            // TODO
            //if ( ttl > 0 ){
            payload.planes.push( { id, human, ttl, age, x, y, r, a, p, cs, name, value, score, reckless } )
            //}
            {
                const {id, x,y,as,ttl,cs,idx} = leaving
                if ( ttl > 0 ){
                    payload.leavings.push({id,x,y,as,cs,idx})
                }
            }
            {
                const {id, x,y,as,ttl} = falling
                if ( ttl > 0 ){
                    payload.fallings.push({id, x,y,as,cs,idx})
                }
            }
            if ( explosion.ttl > 0 ){
                let { id, x,y,justfired } = explosion

                if ( justfired.ttl > 0 ){
                    payload.justfired.push({ id, x,y, type : justfired.type, num : justfired.num } )
                }
                
                explosion.debris.forEach( debri => {
                    let { id, x, y, a, dtype, cs } = debri
                    payload.debris.push( { id, x, y, a, dtype, cs } )
                })
            }
            plane.bombs.forEach( bomb => {
                let { id, x, age, y, a, p, cs, ttl, step, explosion, justfired } = bomb

                if ( justfired.ttl > 0 ){
                    payload.justfired.push( { id, x,y, type : justfired.type, num : justfired.num } )
                }
                
                payload.bombs.push( { id, age, x, y, a, p, cs, ttl /*, step */ } )
                if ( explosion.ttl > 0 ){
                    let { id, x,y,justfired } = explosion

                    if ( justfired.ttl > 0 ){
                        payload.justfired.push( { id, x,y, type : justfired.type, num : justfired.num } )
                    }

                    explosion.debris.forEach( debri => {
                        let { id, x, y, a, cs, dtype } = debri
                        payload.debris.push( { id, x, y, a, cs, dtype } )
                    })
                }
            })
            plane.missiles.forEach( missile => {
                let { id, age, x, y, a, p, cs, ttl, step, explosion, justfired } = missile
                if ( justfired.ttl > 0 ){
                    payload.justfired.push( { id, x,y, type : justfired.type, num : justfired.num } )
                }
                payload.missiles.push( { id, age, x, y, a, p, cs, ttl, justfired /*, step */ })               
                if ( explosion.ttl > 0 ){
                    let { id, x,y,justfired } = explosion

                    
                    if ( justfired.ttl > 0 ){
                        payload.justfired.push( { id, x,y, type : justfired.type, num : justfired.num } )
                    }
                    explosion.debris.forEach( debri => {
                        let { x, y, a, dtype } = debri
                        payload.debris.push( { id, x, y, a, cs, dtype }) 
                    })
                }
            })
            plane.guidedmissiles.forEach( guidedmissile => {
                let { id, age, x, y, a, p, cs, ttl, step, explosion, justfired } = guidedmissile
                if ( justfired.ttl > 0 ){
                    payload.justfired.push( { id, x,y, type : justfired.type, num : justfired.num } )
                }
                payload.guidedmissiles.push( {id,  age, x, y, a, p, cs, ttl, justfired /*, step */ })               
                if ( explosion.ttl > 0 ){
                    let { x,y,id, justfired } = explosion

                    
                    if ( justfired.ttl > 0 ){
                        payload.justfired.push( { id, x,y, type : justfired.type, num : justfired.num } )
                    }
                    explosion.debris.forEach( debri => {
                        let { x, y, a, dtype } = debri
                        payload.debris.push( { id, x, y, a, cs, dtype } )
                    })
                }
            })
            
        })
        Object.keys( playerByInputId ).forEach( inputId => {
            let player = playerByInputId[ inputId ]
            if ( ! player ) return
            let plane = player.plane
            if ( ! plane ) return
            const idx = State.planes.findIndex( p => plane === p )
            const id = State.planes[ idx ].id
            let me = {
                type : 'planes',
                idx,
                id
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
