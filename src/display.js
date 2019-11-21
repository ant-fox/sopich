import { prepareImages } from './symbols.js'
const Images = prepareImages()
import { clamp } from './utils.js'
import { worldSize } from './game.js'

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

function setCanvasDimensions( canvas, previousDimensions ) {
    // On small screens (e.g. phones), we want to "zoom out" so players can still see at least
    // 200 in-game units of width.
    const scaleRatio = Math.max( 1, 200 / window.innerWidth )
    const width = Math.floor( scaleRatio * window.innerWidth ) 
    const height = Math.floor( scaleRatio * window.innerHeight )
    if ( ( canvas.width === width ) && ( canvas.height === height ) ){
        return
    } 
    canvas.width = width
    canvas.height = height

}
export function Display() {
    
    const $canvas = document.createElement('canvas')
    $canvas.classList.add('game')
    $canvas.width = 800//100//320
    $canvas.height = 600//200
    document.body.appendChild( $canvas )
    const $context = $canvas.getContext('2d')

    let State
    function putSprite( image, x, y ){
        $context.drawImage( image, Math.floor(x)  , Math.floor(y) - image.height  )
    }
    function display(){

        setCanvasDimensions( $canvas )
        
        if ( !State ) {
            return
        }
        //        console.log( State )
        if ( ! State.planes ){
            return 
        } 
        if ( ! State.planes.length ){
            return 
        }
        // camera
        const me = State.me

        const camera_target = State[ me.type ][ me.idx ]
        
        const left = clamp(
            // TODO : 8
            8 + camera_target.x -  $canvas.width / 2, 
            worldSize.x1,
            worldSize.x2 - $canvas.width
        )
        const right = left +  $canvas.width       
        const bottom = clamp(
            camera_target.y - $canvas.height / 2,
            worldSize.y1,
            worldSize.y2 -  $canvas.height
        )   
        const top = bottom +  $canvas.height

        function world_to_context( x, y ){
            return {
                x : x - left,
                y : $canvas.height - y + bottom
            }
        }
        /*
        function context_to_world( cx, cy ){
            return {
                x : left - x ,
                y : -200 + y - top 
            }
        }
*/
        // sky
        {
            $context.fillStyle = 'black'//'SkyBlue'
            $context.fillRect(0,0,$canvas.width,$canvas.height)
        }

        // ground
        const ground = State.ground
        if ( ground ){
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
        }
        
        // targets
        if ( true ){
            const { xs, tys, hits } = State.targets
            $context.fillStyle = 'black'
            for ( let i = 0 ; i < xs.length ; i++ ){
                let x = xs[ i ]        
                let y = ground[ Math.floor( x ) % ground.length ]
                let ty = tys[ i ]
                let hit = hits[ i ]
                let wxy = world_to_context( x, y )
                if ( hit ){
                    $context.fillStyle = 'rgba(255,255,255,0.1)'
                    putSprite( Images.target_hit, wxy.x  , wxy.y )
                } else {
                    putSprite( Images.targets[ty], wxy.x  , wxy.y )
                }
            }
        }

        /// planes
        const planes = State.planes
        if ( planes ){
            State.planes.forEach( plane => {
                const { ttl, x, y, r, a, p, /*bombs, missiles, explosion*/ name } = plane
                if ( ttl < 0 ){
                    return
                }
                $context.fillStyle = 'black'
                
                //let va = Math.floor(posmod(a, 2 * Math.PI) / ( 2 * Math.PI ) * 16 )
                let va = a
                let vr = r?1:0
                //$context.putImageData( Images.pln[vr][va], $canvas.width/2, $canvas.height/2)
                let wxy = world_to_context( x, y )
                //            console.log( 'vrva', vr, va )
                putSprite( Images.plane[vr][va], wxy.x  , wxy.y )
                
                //$context.drawImage( Images.plane[vr][va], wxy.x - 8 , wxy.y - 8 )
                
                $context.fillStyle = 'white'
                $context.font = "10px monospace";
                $context.fillText(`${ name } ${Math.floor(x)},${Math.floor(y)},${p}`,
                                  wxy.x + 8 , wxy.y + 18 )
            })
        }

        const bombs = State.bombs
        if ( bombs ) {
            for ( let i = 0, l = bombs.length ; i < l ; i++ ){        
                const bomb = bombs[i]
                const { x, y, a, p, ttl, explosion } = bomb
                if ( ttl > 0 ){
                    let wxy = world_to_context( x, y )
                    putSprite( Images.bomb[a], wxy.x , wxy.y ) 
                }
            }
        }
        const missiles = State.missiles
        if ( missiles ){
            for ( let i = 0, l = missiles.length ; i < l ; i++ ){        
                const missile = missiles[i]
                const { x, y, a, p, ttl, explosion } = missile
                if ( ttl > 0 ){
                    let wxy = world_to_context( x, y )
                    putSprite( Images.missile[a], wxy.x , wxy.y ) 
                }
            }
        }
        const debris = State.debris
        if (debris){
            for ( let j = 0, ll = debris.length ; j < ll ; j++ ){
                let { x, y, a, ttl, dtype } = debris[ j ]
                let wxy = world_to_context( x, y )
                putSprite( Images.debris[dtype], wxy.x , wxy.y )             
            }
        }
        const flocks = State.flocks
        if (flocks){
            for ( let j = 0, ll = flocks.length ; j < ll ; j++ ){
                let { x, y, as } = flocks[ j ]
                let wxy = world_to_context( x, y )
                putSprite( Images.flock[as], wxy.x , wxy.y )             
            }
        }
        const birds = State.birds
        if (birds){
            for ( let j = 0, ll = birds.length ; j < ll ; j++ ){
                let { x, y, as } = birds[ j ]
                let wxy = world_to_context( x, y )
                putSprite( Images.bird[as], wxy.x , wxy.y )             
            }
        }
        const fallings = State.fallings
        if (fallings){
            for ( let j = 0, ll = fallings.length ; j < ll ; j++ ){
                let { x, y, as } = fallings[ j ]
                let wxy = world_to_context( x, y )
                putSprite( Images.plane_hit[as], wxy.x , wxy.y )             
            }
        }
        const leavings = State.leavings
        if (leavings){
            for ( let j = 0, ll = leavings.length ; j < ll ; j++ ){
                let { x, y, as } = leavings[ j ]
                let wxy = world_to_context( x, y )
                putSprite( Images.plane_win[as], wxy.x , wxy.y )             
            }
        }
        const oxs = State.oxs
        if (oxs){
            for ( let j = 0, ll = oxs.length ; j < ll ; j++ ){
                let { x, as } = oxs[ j ]
                let y =  ground[ Math.floor( x ) % ground.length ]
                let wxy = world_to_context( x, y )
                putSprite( Images.ox[as], wxy.x , wxy.y )             
            }
        }
    }
    function animate(){
        requestAnimationFrame( animate )
        display()
    }
    return {
        setState : state => State = state,
        display,
        animate,
    }
}
