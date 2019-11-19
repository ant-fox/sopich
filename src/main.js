import { ground } from './ground.js'
import { prepareImages, prepareHitmask } from './symbols.js'

function posmod(n,m) {
    return ((n%m)+m)%m;
};1

const Images = prepareImages()
console.log(Images)
console.log('ok',ground)

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
function init_plane(){
    return {
        
        x : 1500,
        y : 100,
        r : false,
        a : 0,
        p : 2,
        bombs : new Array(8).fill(0).map( (_,i) => ({
            x : 1550+i*20,
            y : 100+i*10,
            a : i,
            p : 1,
            ttl : 100,
            step : 0,
            explosion : init_explosion()
        })),
        missiles : new Array(16).fill(0).map( (_,i) => ({
            x : 1250+i*40,
            y : 100+i*10,
            a : i,
            p : 3,
            ttl : 100,
            step : 0,
            explosion : init_explosion()
        })),
        explosion : init_explosion()
    }
}
const State = {
    plane : init_plane(),
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
    }
        
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
document.body.addEventListener('keydown', ({ code }) => {
    switch ( code ){
    case 'ArrowLeft' : inputs.push( 'noseup' ) 
        break
    case 'ArrowRight' : inputs.push( 'nosedown' ) 
        break
    case 'ArrowUp' : inputs.push( 'reverse' ) 
        break
    case 'PageUp' : inputs.push( 'powerup' ) 
        break
    case 'PageDown' : inputs.push( 'powerdown' ) 
        break
    case 'ShiftRight' : inputs.push( 'firemissile' ) 
        break
    case 'Enter' : inputs.push( 'firebomb' ) 
        break
    default : console.log(code)
    }
})

function clamp( x, a, b ){
    return Math.max(a,Math.min(x,b))
}
function groundTargets(){
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
    
    const { x, y, r, a, p, bombs, missiles, explosion } = State.plane
    const { xs, tys, hits } = State.targets

    // camera
    const left = clamp(
        State.plane.x -  $canvas.width / 2,
        0, 3000 - $canvas.width
    )
    const right = left +  $canvas.width 
    const top = clamp(
        State.plane.y -  $canvas.height / 2,
        0,
        180
    )
    
    const bottom = top +  $canvas.height


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
            
            putSprite( Images.target_hit, wxy.x  , wxy.y )
            //putSprite( Images.targets[ty], wxy.x  , wxy.y )
        } else {
            putSprite( Images.targets[ty], wxy.x  , wxy.y )
        }
//        $context.drawImage( Images.targets[ty], wxy.x  , wxy.y - 16)
    }
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
//    displayGround()
  //  display
    
    
}

function animate(){
    requestAnimationFrame( animate )
    display()
}
animate()

const BombDropAngle = [0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8]
const BombDropOffset = [[0,0]]
function handleinputs(){
    const { x, y, r, a, p, bombs, missiles } = State.plane
    let dda = 0
    let reverse = 0
    let dds = 0
    let firebomb = 0
    let firemissile = 0
    while ( inputs.length ){
        const input = inputs.shift()
        switch ( input ){
        case 'noseup' : dda = 1 ; break
        case 'nosedown' : dda = -1 ; break
        case 'reverse' : reverse = 1 ; break
        case 'powerup' : dds = 1 ; break
        case 'powerdown' : dds = -1 ; break
        case 'firebomb' : firebomb = 1 ; break
        case 'firemissile' : firemissile = 1 ; break
        }
    }
    let da = dda
    State.plane.a = posmod( a + da, 16 )
    if ( reverse ){
        State.plane.r = !(State.plane.r)
    }
    let ds = dds
    State.plane.p = clamp( State.plane.p + ds, 0, 4)
    if (firebomb){
        let off = BombDropOffset[ a % BombDropOffset.length]
        let normal = ( a + (r?4:12) ) % directions16.length 
        let dir = directions16[ normal ]
        bombs[0].x = x + off[0] + ( 16 / 2 ) - ( 8 / 2 ) + dir[0] * 8
        bombs[0].y = y + off[1] + ( 16 / 2 ) - ( 8 / 2 ) + dir[1] * 8
        bombs[0].p = clamp( p-1,1,3)
        bombs[0].ttl = 100
        bombs[0].step = 0
        bombs[0].a = a >> 1        
    }
    if (firemissile){
        let off = BombDropOffset[ a % BombDropOffset.length]
        let normal = ( a + (r?4:12) ) % directions16.length 
        let dir = directions16[ normal ]
        missiles[0].x = x + off[0] + ( 16 / 2 ) - ( 8 / 2 ) + dir[0] * 8
        missiles[0].y = y + off[1] + ( 16 / 2 ) - ( 8 / 2 ) + dir[1] * 8
        missiles[0].ttl = 100
        missiles[0].p = 4
        missiles[0].step = 0
        missiles[0].a = a 
    }
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
            console.log('yes')
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
    const { x, y, r, a, p, bombs, missiles, explosion } = State.plane
    let dx = directions16[ a ][ 0 ] * p * 2
    let dy = directions16[ a ][ 1 ] * p * 2
    State.plane.x = x + dx
    State.plane.y = y + dy
    if ( State.plane.y > 420 ){
        State.plane.a = 12
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
    
}
function rectangle_intersection(x1,y1,w1,h1,x2,y2,w2,h2, o = {} ){
    o.l = Math.max( x1, x2 )
    o.r = Math.min( x1 + w1 , x2 + w2 )
    if ( o.l >= o.r )
        return 
    o.b = Math.max( y1, y2 )
    o.t = Math.min( y1 + h1 , y2 + h2)
    if ( o.b >= o.t )
        return
    return o
}
const Hitmasks = prepareHitmask()

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
                if ( State.pxcoll.list.length > 40000 ){
                    State.pxcoll.list.shift()
                }
                State.pxcoll.list.push( [ i, j, getRandomColor()] )
                docoll = true
            }
        }
    }
    return docoll
}

const Colliders = [
    
]

function collisions(){
    const { x, y, r, a, p, bombs, missiles, explosion } = State.plane
    const { xs, tys, hits, broken } = State.targets

    ;[ [ [ State.plane ], item => Hitmasks.plane[ (item.r)?1:0 ][ item.a ] ],
       [ bombs, item => Hitmasks.bomb[ item. a ] ],
       [ missiles, item => Hitmasks.missile[ item. a ] ]
     ].forEach( ([ items, hitmaskf ]) => {
         
         items.forEach( item => {
             if ( item.ttl > 0 ){
               const explosion = item.explosion               
               const hitmask = hitmaskf( item )
               const x = item.x
               const y = item.y
               
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
                   hits[ i ] = false
                   broken[ i ] = false
               }
           }
             }
           })
       })
           
}
     
     

const FPS = 16//2//16

function gameloop(){
    window.setInterval( () => {
        State.plane.x += OFFSET.x
        State.plane.y += OFFSET.y
        OFFSET = {x:0,y:0}
        State.pxcoll.list = []
        if ( !PAUSED ){
            handleinputs()
            move()
        }
        collisions()

    },1000/FPS)
}

gameloop()
