import { prepareImages } from './symbols.js'
const Images = prepareImages()
import { clamp } from './utils.js'

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

export function Display() {
    

    const $canvas = document.createElement('canvas')
    $canvas.width = 640
    $canvas.height = 200
    document.body.appendChild( $canvas )
    const $context = $canvas.getContext('2d')

    let State

    function putSprite( image, x, y ){
        $context.drawImage( image, Math.floor(x)  , Math.floor(y - image.height)  )
    }

  
function display_explosion2(explosion, world_to_context){
        
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
        if ( ground ){

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
        }
        if ( true ){
            const { xs, tys, hits } = State.targets

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
        }
        ///
        /// planes
        
        ///
        State.planes.forEach( plane => {
            const { x, y, r, a, p, /*bombs, missiles, explosion*/ name } = plane

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
  // explosion
            //display_explosion(explosion, world_to_context)
        })
            if ( true ) {

                // bombs
                const bombs = State.bombs
                for ( let i = 0, l = bombs.length ; i < l ; i++ ){        
                    const bomb = bombs[i]
                    const { x, y, a, p, ttl, explosion } = bomb
                    if ( ttl > 0 ){
                        let wxy = world_to_context( x, y )
                        putSprite( Images.bomb[a], wxy.x , wxy.y ) 
                    }
                    // explosion
                    //display_explosion(explosion, world_to_context)
                }
                // missiles
                
                const missiles = State.missiles
                for ( let i = 0, l = missiles.length ; i < l ; i++ ){        
                    const missile = missiles[i]
                    const { x, y, a, p, ttl, explosion } = missile
                    if ( ttl > 0 ){
                        let wxy = world_to_context( x, y )
                        putSprite( Images.missile[a], wxy.x , wxy.y ) 
                    }

                    // explosion
                    //display_explosion(explosion, world_to_context)
                    
                }

                
                // collision dbg
                /*
                  State.pxcoll.list.forEach( ([x,y,col]) => {
                  let wxy = world_to_context( x, y )
                  wxy.x = Math.floor( wxy.x )
                  wxy.y = Math.floor( wxy.y )
                  $context.fillStyle = col
                  $context.fillRect(wxy.x-0.5,wxy.y-0.5,1,1)

                  
                  })
                */
            
            }
        const debris = State.debris
        if (debris){
            for ( let j = 0, ll = debris.length ; j < ll ; j++ ){
                let { x, y, a, ttl, dtype } = debris[ j ]
                let wxy = world_to_context( x, y )
                putSprite( Images.debris[dtype], wxy.x , wxy.y )             
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
