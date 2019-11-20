import { ground } from './ground.js'
import { prepareImages, prepareHitmask, prepareBottomHitmask } from './symbols.js'
import { Tree } from './coll.js'

function clamp( x, a, b ){
    return Math.max(a,Math.min(x,b))
}
function posmod(n,m) {
    return ((n%m)+m)%m;
};1

const Images = prepareImages()
const $canvas = document.createElement('canvas')
$canvas.width = 640
$canvas.height = 200
document.body.appendChild( $canvas )
const $context = $canvas.getContext('2d')

function getRandomColor() {
    if (Math.random()>0.5){
        return 'black'
    } else {
        return 'white'
    }
    
    var letters = '0123456789ABCDEF';
    var color = '#';
    for (var i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}
function init_ground(){
    return ground.map( x => x )
}
function init_explosion(){
    return {
        p : 4,
        ttl : 100,
        step : 0,
        debris : new Array(16).fill(0).map( (_,i) => {
            return init_debris( i )
        })
    }       
}
function init_debris( i, x = 1600, y = 100 ){
    return {
        x : x+Math.floor( Math.random()*50 ),
        y : y+Math.floor( Math.random()*50 ),
        a : ( (i*((Math.random()>0.5)?1:2)) % 16 ),
        dtype : ( i % 8 ),
    }
}
function init_plane(i){
    return {
        x : 1500 + i * 10,
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
            ttl : 0,
            step : 0,
            explosion : init_explosion()
        })),
        missiles : new Array(16).fill(0).map( (_,i) => ({
            x : 1250+i*40,
            y : 100+i*10,
            a : i,
            p : 3,
            ttl : 0,
            step : 0,
            explosion : init_explosion()
        })),
        explosion : init_explosion()
    }
}
const State = {
    ground : init_ground(),
    planes : new Array(1).fill(0).map( (_,i) => init_plane(i) ),
    targets : {
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
    },
    pxcoll : {
        list : []
    },
    version : 0,
    tree : new Tree( 4096, 256, 16 )

    
}
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
const inputs = []
function input_send0( input ){
    inputs.push( { input, client : 0 } )
    inputs.push( { input, client : 4 } )
}
document.body.addEventListener('keydown', ({ code }) => {
    switch ( code ){
    case 'ArrowLeft' : input_send0( 'noseup' ) 
        break
    case 'ArrowRight' : input_send0( 'nosedown' ) 
        break
    case 'ArrowUp' : input_send0( 'reverse' ) 
        break
    case 'PageUp' : input_send0( 'powerup' ) 
        break
    case 'PageDown' : input_send0( 'powerdown' ) 
        break
    case 'ShiftRight' : input_send0( 'firemissile' ) 
        break
    case 'Enter' : input_send0( 'firebomb' ) 
        break
    default : console.log(code)
    }
})
function putSprite( image, x, y ){
    $context.drawImage( image, Math.floor(x)  , Math.floor(y - image.height)  )
}
function display_explosion(explosion, world_to_context){

    const debris = explosion.debris
    const ettl = explosion.ttl
    if ( ettl > 0 ){
        for ( let j = 0, ll = debris.length ; j < ll ; j++ ){
            let { x, y, a, ttl, dtype } = debris[ j ]
            let wxy = world_to_context( x, y )
            putSprite( Images.debris[dtype], wxy.x , wxy.y )             
        }
    }
}

function display(){
    

    // camera
    const camera_target = State.planes[0]
    
    const left = clamp(
        camera_target.x -  $canvas.width / 2,
        0, 3000 - $canvas.width
    )
    const right = left +  $canvas.width 
    const top = clamp(
        camera_target.y -  $canvas.height / 2,
        0,
        180
    )   
    const bottom = top +  $canvas.height

    const { xs, tys, hits } = State.targets


    function world_to_context( x, y ){
        return {
            x : x - left,
            y : 200 - y + top 
        }
    }
    function context_to_world( cx, cy ){
        return {
            x : left - x ,
            y : -200 + y - top 
        }
    }

    // sky
    $context.fillStyle = 'black'//'SkyBlue'
    $context.fillRect(0,0,$canvas.width,$canvas.height)
    
    const ground = State.ground

    // ground
    //$context.fillStyle = getRandomColor()
    $context.fillStyle = 'green'
    let lastwy = 0
    let asLine = false
    for ( let i = 0 ; i <= $canvas.width ; i++ ){

        let wx = left + i
        let wy = (wx<0)?(Math.random()*10):ground[ Math.floor( wx ) % ground.length ]        
        let cxy = world_to_context( wx, wy )
        if ( asLine ){
            
            lastwy = wy
        } else {
            $context.fillRect(Math.floor(i),
                              Math.floor(cxy.y),
                              Math.floor(1),
                              Math.ceil($canvas.height - cxy.y))
        }
        
    }
    // targets
    $context.fillStyle = 'black'
    for ( let i = 0 ; i < xs.length ; i++ ){
        let x = xs[ i ]        
        let y = ground[ Math.floor( x ) % ground.length ]
        let ty = tys[ i ]
        let hit = hits[ i ]
        let wxy = world_to_context( x, y )
        if ( hit ){
            $context.fillStyle = 'rgba(255,255,255,0.1)'
            /*
            let wcb = world_to_context( hit.l, hit.t )
            $context.fillRect(wcb.x,
                              0,//wcb.y,
                              hit.r-hit.l,
                              200//hit.b-hit.t,
                             )
            $context.fillRect(0,
                              wcb.y,
                              800,
                              hit.t-hit.b,
                             )
            */
            putSprite( Images.target_hit, wxy.x  , wxy.y )
            //putSprite( Images.targets[ty], wxy.x  , wxy.y )
        } else {
            putSprite( Images.targets[ty], wxy.x  , wxy.y )
        }
        //        $context.drawImage( Images.targets[ty], wxy.x  , wxy.y - 16)

    }

    ///
    /// planes
    
    ///
    State.planes.forEach( plane => {
        const { x, y, r, a, p, bombs, missiles, explosion } = plane

        $context.fillStyle = 'black'
        
        //let va = Math.floor(posmod(a, 2 * Math.PI) / ( 2 * Math.PI ) * 16 )
        let va = a
        let vr = r?1:0
        //$context.putImageData( Images.pln[vr][va], $canvas.width/2, $canvas.height/2)
        let wxy = world_to_context( x, y )

        putSprite( Images.plane[vr][va], wxy.x  , wxy.y )

        //$context.drawImage( Images.plane[vr][va], wxy.x - 8 , wxy.y - 8 )
        
        $context.fillStyle = 'white'
        $context.font = "10px monospace";
        $context.fillText(`${Math.floor(x)},${Math.floor(y)},${p}`,
                          wxy.x + 8 , wxy.y + 18 )


        // bombs
        
        for ( let i = 0, l = bombs.length ; i < l ; i++ ){        
            const bomb = bombs[i]
            const { x, y, a, p, ttl, explosion } = bomb
            if ( ttl > 0 ){
                let wxy = world_to_context( x, y )
                putSprite( Images.bomb[a], wxy.x , wxy.y ) 
            }
            // explosion
            display_explosion(explosion, world_to_context)
        }
        // missiles
        
        for ( let i = 0, l = missiles.length ; i < l ; i++ ){        
            const missile = missiles[i]
            const { x, y, a, p, ttl, explosion } = missile
            if ( ttl > 0 ){
                let wxy = world_to_context( x, y )
                putSprite( Images.missile[a], wxy.x , wxy.y ) 
            }

            // explosion
            display_explosion(explosion, world_to_context)
            
        }

        // explosion
        display_explosion(explosion, world_to_context)
        
        // collision dbg
        State.pxcoll.list.forEach( ([x,y,col]) => {
            let wxy = world_to_context( x, y )
            wxy.x = Math.floor( wxy.x )
            wxy.y = Math.floor( wxy.y )
            $context.fillStyle = col
            $context.fillRect(wxy.x-0.5,wxy.y-0.5,1,1)

            
        })
    })
}

function animate(){
    requestAnimationFrame( animate )
    display()
}
animate()

/*
 *
 */
function available_ttl( items ){
    for ( let i = 0, l = items.length ; i < l ; i++ ){
        if ( items[ i ].ttl <= 0 ){
            return i
        }
    }
    return items.length
}

const BombDropAngle = [0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8]
const BombDropOffset = [[0,0]]

function init_client_merged_input( plane ){
    return {
        plane,
        dda : 0, reverse : 0, dds : 0, firebomb : 0, firemissile :0
    }
}
function init_client_merged_inputs(){
    return State.planes.map( init_client_merged_input )
}
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
            let off = BombDropOffset[ a % BombDropOffset.length]
            let normal = ( a + (r?4:12) ) % directions16.length 
            let dir = directions16[ normal ]
            let avail = available_ttl( bombs )
            if ( avail !== bombs.length ){
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

const directions16 = new Array( 16 ).fill(0)
      .map( (_,i) => ( i * 2 * Math.PI / 16 ) )
      .map( x => [ Math.cos( x ), Math.sin( x ) ] )

const directions8 = new Array( 8 ).fill(0)
      .map( (_,i) => ( i * 2 * Math.PI / 8 ) )
      .map( x => [ Math.cos( x ), Math.sin( x ) ] )

const toFall8 = [7,0,6,4,5,6,6,6]

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
function move(){

    State.planes.forEach( plane => {
        
        const { x, y, r, a, p, bombs, missiles, explosion } = plane
        let dx = directions16[ a ][ 0 ] * p * 2
        let dy = directions16[ a ][ 1 ] * p * 2
        plane.x = x + dx
        plane.y = y + dy
        if ( plane.y > 420 ){
            plane.a = 12
            //        State.plane.r = !(State.plane.r)
            
        }
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
}
import { rectangle_intersection } from './rect.js'
const Hitmasks = prepareHitmask()
const BottomHitmasks = prepareBottomHitmask()

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

function collisions(){
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
                         let tx = xs[ i ]
                         let ty = ground[ Math.floor( tx ) % ground.length ]
                         let hit = hits[ i ]
                         let ttype = tys[ i ] // type
                         let o = {}
                         if ( rectangle_intersection( x,y,hitmask.w,hitmask.h, 
                                                      tx,ty,16,16,
                                                      o ) ){
                             if ( pixel_collision( o,
                                                   x,y,hitmask.w,hitmask.h,
                                                   hitmask,
                                                   //Hitmasks.plane[ r?1:0 ][ a ],
                                                   tx,ty,16,16,
                                                   Hitmasks.targets[ ttype ]) ){
                                 hits[ i ] = o
                                 broken[ i ] = true
                                 //item.ttl = 0
                                 //
                                 explosion.ttl = 10
                                 explosion.step = 0
                                 explosion.p = 2
                                 const debris = explosion.debris
                                 for ( let j = 0, ll = debris.length ; j < ll ; j++ ){
                                     const debri = debris[ j ]
                                     debri.x = x
                                     debri.y = y
                                 }
                                 //
                                 
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
                 if (( item.ttl === undefined ) || (item.ttl > 0 )){
                     const bhitmask = bhitmaskf( item )
                     const x = item.x
                     const fx = Math.floor(x)
                     const y = item.y
                     let collides = pixel_bottom_collision(fx,y,bhitmask)
                     if ( collides ) {
                         item.ttl = 0
                         const explosion = item.explosion
                         //
                         explosion.ttl = 10
                         explosion.step = 0
                         explosion.p = 2
                         const debris = explosion.debris
                         for ( let j = 0, ll = debris.length ; j < ll ; j++ ){
                             const debri = debris[ j ]
                             debri.x = x
                             debri.y = y
                         }
                         //
                         
                     }
                     
                     
                 }
             })
         })
    })
    console.log('ncoll',ncoll)
}



function ia(){
    let commands = [
        'noseup',
        //    'nosedown',
        //'reverse','powerup',
        'firemissile','firebomb'
    ]
    let clients = [1,2,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19]
    for ( let i = 0 ; i < 30 ; i++){
        let input = commands[ Math.floor( Math.random() * commands.length ) ]
        let client = clients[ Math.floor( Math.random() * clients.length ) ]
        inputs.push( { input, client } )
    }

}
function groundTargets(){
    const ground = State.ground
    const { xs, tys } = State.targets
    for ( let i = 0 ; i < xs.length ; i++ ){
        let x = xs[ i ]        
        
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
    }
    
}
groundTargets()

const FPS = 16//16//2//16

let lastUpdateTime = Date.now()
function gameloop(){
    window.setInterval( () => {
        const now = Date.now()    
        const dt = (now - lastUpdateTime) / 1000;
        lastUpdateTime = now;
        let rfps =  1 / dt / FPS
        if ( ( rfps > 1.5 ) || ( rfps < 0.75 ) ){
            console.error( `update after ${ dt }s, should be ${ 1/FPS }s ; at ${ 1 / dt }fps, should be ${ FPS  }fps  `)
        }
        
        const controlled_debug_plane = State.planes[0]
        
        //
        controlled_debug_plane.x += OFFSET.x
        controlled_debug_plane.y += OFFSET.y
        OFFSET = {x:0,y:0}
        //
        State.pxcoll.list = []
        //
        if ( !PAUSED ){
            ia()
            handleinputs()
            move()
        }
        collisions()

    },1000/FPS)
}

gameloop()
