import { prepareImages, ColorSchemes } from './symbols.js'
const Images = prepareImages()
import { clamp, length } from './utils.js'
import { worldSize } from './game.js'

const DEBUG_AGE = false

function LeaderBoardDisplay(){
    const MAX_DISPLAYED = 10
    
    function $buildContainer(){
        let $div = document.createElement('pre') 
        $div.style = 'position:fixed;display:block;color:white;z-index:25;'
            +'width:auto;height:auto;'
            +'right:0px;top:0px;'
            +'opacity:0.9'
            +';margin:0px;padding-left:1em;padding-right:1em;'
            +'background-color:rgb(130, 98, 50,0.5);'
            +'border-bottom-left-radius:15px;'
        $div.classList.add('noselect')
        return $div
    }
    const $div = $buildContainer()
    document.body.appendChild( $div )
    
    function hide(){
        state.visible = false
        $div.style.visibility = 'collapse'
    }
    function show(){
        state.visible = false
        display()
        $div.style.visibility = 'visible'
    }
    function update( leaderboard ){

        let width1 = clamp(leaderboard.reduce(
            (r,{username}) => Math.max( r, username.length ),
            0
        ),8,32)
        
        let width2 = clamp(leaderboard.reduce(
            (r,{score}) => Math.max( r, score.toString().length ),
            0
        ),4,20)
        $div.innerHTML = leaderboard
            .sort( (a,b) => b.score - a.score )
            .slice(0,MAX_DISPLAYED)
            .map( x => ['<p>',
                        ([
                            x.username.padEnd( width1,' ' ),
                            x.score.toString().padStart( width2,' ')
                        ].join(' ')),
                        '</p>'
                       ].join(''))
            .join('')


    }
    return { hide, show, update }
}
const leaderboardDisplay = LeaderBoardDisplay()

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
/*
 * background stars
 */
// fixed points needed when the ground is not visible
function init_stars(){
    const count = 100
    const stars = new Array( count ).fill( 0 ).map( (_,i) => {
        // evenly spaced plus random
        const x = worldSize.x1 + ( i / count * worldSize.w )
              + ( ( Math.random() * 2 - 1 ) * ( worldSize.w / count / 4 ) )
        // push to top
        const y = worldSize.y1 + Math.pow( Math.random(), 0.6 ) * worldSize.h
        const brightness = Math.floor( Math.random() * 3 )
        return { x, y, brightness }
    })
    return stars
}
function update_stars( stars ){
    if (stars){
        // change one by turn
        let star = stars[ Math.floor( Math.random() * stars.length ) ]
        if (star){
            let b = star.brightness
            if ( b === 0 ){
                star.brightness = 1
            } else if ( b === 2 ){
                star.brightness = 1
            } else {
                if (Math.random()<0.5){
                    star.brightness = 0
                } else {
                    star.brightness = 2
                }
            }
        }
    }
}
/*
 * missile & explosion trails
 */
function TrailPoints(){
    const trailPoints = new Array( 500 ).fill(0).map( x => undefined )
    let currentTrailPointIdx = 0
    function display( world_to_context, $context, putSprite ){
        const now = Date.now()
        const minAge = 130
        const maxAge = 1000
        trailPoints.filter( x => x !== undefined ).forEach( ({x,y,color,spread,size,date}) => {
            const age = now - date
            if ( ( age > minAge) && ( age < maxAge ) ){
                const prog =  1 - ( (age - minAge) / (maxAge-minAge) )
                let cxy = world_to_context( x, y )
                $context.fillStyle = color
                const r1 = ( Math.random() - 0.5 ) * 2 * spread
                const r2 = ( Math.random() - 0.5 ) * 2 * spread
                const s = size * prog
                const ss = -1 * s/4
                //$context.fillRect( cxy.x + r1 -ss, cxy.y+r2-ss, s, s)
                $context.fillRect( cxy.x + r1 + ss, cxy.y + r2 + ss, s, s )
            }
        })
    }
    function add(x,y,color,spread,size){
        if ( trailPoints.length ){
            trailPoints[ currentTrailPointIdx ] = { x, y, color, spread, size, date : Date.now() }
            currentTrailPointIdx = ( currentTrailPointIdx + 1 ) % trailPoints.length        
        }
    }
    return { add, display }
}
export function Display() {
    
    const stars = init_stars()
    const trailPoints = TrailPoints()
    
    const $canvas = document.createElement('canvas')
    $canvas.classList.add('game')
    $canvas.width = 800//100//320
    $canvas.height = 600//200
    document.body.appendChild( $canvas )
    const $context = $canvas.getContext('2d')

    
    let State
    function putSprite( image, x, y ){
        // $context.drawImage( image, Math.floor(x)  , Math.floor(y) - image.height  )
        $context.drawImage(
            image,
            Math.floor(x),
            Math.floor(y) - image.height,
            image.width,
            image.height,
        )
    }

    let last_camera_target = undefined
    let last_camera_target_to_center_dist = undefined
    let position_helper_ttl = -1
    let position_helper_max_ttl = 120
    
    function display(){

        $context.imageSmoothingEnabled = false
        
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
        const leaderboard = State.leaderboard
        if ( leaderboard ){
            leaderboardDisplay.update( leaderboard ) 
            //console.log('leaderboard',leaderboard)
            //updateLeaderboard( leaderboard )
            // console.log('yes')
        } else {
            // console.log('no')
        }

        const me = State.me

        /*
         * camera
         */
        const camera_target = Object.assign({}, State[ me.type ][ me.idx ] )

        
        if ( last_camera_target === undefined ){
            last_camera_target = camera_target
        } else {
            let dx = camera_target.x - last_camera_target.x
            let dy = camera_target.y - last_camera_target.y
            let md = Math.abs( dx ) + Math.abs( dy )
            let ratio = 0.05
            let threshold = 200
            if ( dx > threshold ){
                // the movement is too big for a moving object
                camera_target.x = Math.floor( last_camera_target.x + dx * ratio )
                camera_target.y = Math.floor( last_camera_target.y + dy * ratio )
            } 
            last_camera_target = camera_target
        }
        
        const left = clamp(
            // TODO : 8
            8 + camera_target.x -  $canvas.width / 2,
            worldSize.x1,
            worldSize.x2 - $canvas.width
        )
        const right = left +  $canvas.width
        
        const bottom = clamp(
            camera_target.y - $canvas.height /  2,
            worldSize.y1,
            worldSize.y2 -  $canvas.height
        )   
        const top = bottom +  $canvas.height

        
        let camera_target_to_center = {
            x : Math.abs( camera_target.x - ( left + right ) / 2 ),
            y : Math.abs( camera_target.y - ( top + bottom ) / 2 ),
        }
        let camera_target_to_center_dist = length( camera_target_to_center )

        // detect abrupt screen position change
        let abrubt_target_screen_position_change = false
        if ( last_camera_target_to_center_dist ){
            let distsdiff = Math.abs( camera_target_to_center_dist - last_camera_target_to_center_dist )
            if ( distsdiff > 10 ){
                //console.log( distsdiff )
                abrubt_target_screen_position_change = true
                position_helper_ttl = position_helper_max_ttl + 1
            }
        }
        last_camera_target_to_center_dist = camera_target_to_center_dist
        if ( position_helper_ttl > 0 ){
            position_helper_ttl--
            //console.log( position_helper_ttl )
        }
        function world_to_context( x, y ){
            return {
                x : x - left  ,
                y : $canvas.height - y  + bottom
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
        let drawZone
        {
        }
        {
            $context.fillStyle = 'black'            
            $context.fillRect( 0, 0, $canvas.width, $canvas.height )
            if (false){
                let cxy = world_to_context( worldSize.x1, worldSize.y1 )


                // top left bottom right
                const { x1,x2,y1,y2,w,h } = worldSize
                const bl = world_to_context( worldSize.x1, worldSize.y2 )
                const tr = world_to_context( worldSize.x2,  worldSize.y1 )
                bl.x = clamp( bl.x , 0, $canvas.width )
                tr.x = clamp( tr.x , 0, $canvas.width )
                bl.y = clamp( bl.y , 0, $canvas.height )
                tr.y = clamp( tr.y , 0, $canvas.height )
                if (Math.random()>0.95){
                    //console.log(bl,tr)
                }
                $context.fillStyle = 'SkyBlue'
                $context.fillRect( bl.x, bl.y, tr.x, tr.y )
                
            }
            
            
        }
        // stars

        if (stars){
            if (Math.random()>0.90){
                update_stars( stars )
            }
            const bcolors = [ '#faff', '#a59a', '#0095' ]
            stars.forEach( ({x,y,brightness}) => {
                let cxy = world_to_context( x, y )
                $context.fillStyle = bcolors[ brightness ]
                $context.fillRect( cxy.x, cxy.y, 1,1)                
            })
        }
        trailPoints.display( world_to_context,  $context, putSprite )

        // ground
        const ground = State.ground
        if ( ground ){
            $context.fillStyle = 'green'
            let lastwy = 0
            let asLine = false
            for ( let i = 0 ; i <= $canvas.width ; i++ ){
                let wx = left  + i
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
        
        const targets = State.targets
        if ( targets ) {
            for ( let i = 0, l = targets.length ; i < l ; i++ ){

                const target = targets[i]
                const { x, y, as, broken } = target
                //if ( ttl > 0 ){
                let wxy = world_to_context( x, y )
                if ( broken ){
                    putSprite( Images.target_hit, wxy.x , wxy.y )
                } else {
                    putSprite( Images.targets[as], wxy.x , wxy.y )
                }
                //}
            }
        }
        
        const planes = State.planes
        if ( planes ){
            State.planes.forEach( (plane,planeIdx) => {
                const { reckless, age, ttl, x, y, r, a, p, cs, score, value,  name } = plane
                if ( ttl < 0 ){
                    return
                }
                $context.fillStyle = 'black'

                let va = a
                let vr = r?1:0
                let wxy = world_to_context( x, y )
                if ( reckless ){
                    if ( Math.floor((age/2))%2 ){
                        putSprite( Images.plane[cs][vr][va], wxy.x  , wxy.y )
                    } 
                } else {
                    putSprite( Images.plane[cs][vr][va], wxy.x  , wxy.y )
                }
                
                let col = ColorSchemes[cs][0]
                let rgb = `rgb(${col[0]},${col[1]},${col[2]})`
                $context.fillStyle = rgb

                const is_target_plane = (  me.idx === planeIdx )
                function target_helper( position_helper_ttl, position_helper_max_ttl ){
                    const remain = position_helper_max_ttl -  position_helper_ttl
                    const ratio = 1
                    const maxheight = 64
                    const height = clamp(maxheight * position_helper_ttl / position_helper_max_ttl,0,30)
                    const basewidth = height / ratio
                    const vpad = 10
                    $context.beginPath()
                    $context.moveTo( wxy.x + 16/2, wxy.y + vpad )
                    $context.lineTo( wxy.x + 16/2 - basewidth / 2 , wxy.y + height + vpad )
                    $context.lineTo( wxy.x + 16/2 + basewidth / 2 , wxy.y + height + vpad )
                    $context.closePath()
                    $context.fill()                    
                }
                if (  is_target_plane && ( position_helper_ttl > 0 ) ){
                    target_helper( position_helper_ttl, position_helper_max_ttl)
                    //$context.font = `${ 10 + clamp( position_helper_ttl,0,30)  }px monospace`;
                    /*$context.fillText(`▲`,
                      wxy.x ,  wxy.y + 18 )*/
                    //prefix = '?'
                } else {
                    $context.font = `${ 10  }px monospace`;
                    const displayString = `${ name }`
                    const canvasClamped = {
                        x : clamp( wxy.x, 0, $canvas.width - 8 * ( displayString.length + 1 ) ),
                        y : clamp( wxy.y, 0, $canvas.height - 22 )
                    }
                    $context.fillText(displayString,
                                      canvasClamped.x + 8,
                                      canvasClamped.y + 18)
                    
                    if ( DEBUG_AGE ){
                        /*$context.fillText(`${ name }[${age}](${p})${score.total}/${value}`,
                          wxy.x + 8 , wxy.y + 18 )
                        */
                    } else {
                        /*
                          $context.fillText(`${ name }(${p})${score.total}/${value}`,
                          wxy.x + 8 , wxy.y + 18 )
                        */
                        
                        /*$context.fillText(`${score.total}`,
                          wxy.x + 8 , wxy.y + 18 )
                        */
                        /*context.fillText(`${ name }`,
                          wxy.x + 8 , wxy.y + 18 )*/
                        
                    }
                }
                

                
                $context.fillText(`${ name }`,// ${Math.floor(x)},${Math.floor(y)},${p}`,
                                  wxy.x + 8 , wxy.y + 18 )
                
            })
        }

        const bombs = State.bombs
        if ( bombs ) {
            for ( let i = 0, l = bombs.length ; i < l ; i++ ){        
                const bomb = bombs[i]
                const { x, y, age, a, p, ttl, cs, explosion } = bomb
                if ( ttl > 0 ){
                    let wxy = world_to_context( x, y )
                    putSprite( Images.bomb[cs][a], wxy.x , wxy.y )
                    if ( age !== undefined ){
                        // dbg
                        if (DEBUG_AGE){
                            $context.fillStyle = 'white'
                            $context.font = `${ 10 }px monospace`;
                            $context.fillText(`[${age}]`, wxy.x , wxy.y + 9 )
                        }
                    }
                }
            }
        }
        const missiles = State.missiles
        if ( missiles ){
            for ( let i = 0, l = missiles.length ; i < l ; i++ ){        
                const missile = missiles[i]
                const { x, y, age, a, p, ttl, cs, explosion } = missile
                if ( ttl > 0 ){
                    let wxy = world_to_context( x, y )
                    putSprite( Images.missile[cs][a], wxy.x , wxy.y )
                    trailPoints.add( x + 4, y + 4,'#656', 2, 1 )
                    if ( age !== undefined ){
                        if (DEBUG_AGE){
                            $context.fillStyle = 'white'
                            $context.font = `${ 10 }px monospace`;
                            $context.fillText(`[${age}]`, wxy.x , wxy.y + 9 )
                        }
                    }
                }
            }
        }
        const guidedmissiles = State.guidedmissiles
        if ( guidedmissiles ){
            for ( let i = 0, l = guidedmissiles.length ; i < l ; i++ ){        
                const guidedmissile = guidedmissiles[i]
                const { x, y, age, a, p, ttl, cs, explosion, step } = guidedmissile
                if ( ttl > 0 ){
                    let wxy = world_to_context( x, y )
                    putSprite( Images.guidedmissile[cs][a], wxy.x , wxy.y )
                    //console.log(age)
                    trailPoints.add( x + 4, y + 4,'#886500',3, 2 )
                    
                    /*if ( age !== undefined ){
                      if (DEBUG_AGE){*/
                    $context.fillStyle = 'white'
                    $context.font = `${ 10 }px monospace`;
                    //$context.fillText(`[*]`, wxy.x , wxy.y + 9 )
                    /*}
                      }*/
                }
            }
        }
        const debris = State.debris
        if (debris){
            for ( let j = 0, ll = debris.length ; j < ll ; j++ ){
                let { x, y, a, ttl, cs, dtype } = debris[ j ]
                let wxy = world_to_context( x, y )
                if (Math.random()>0.8){
                    trailPoints.add( x + 4, y + 4,'#88550a',3, 2 )
                }
                putSprite( Images.debris[cs][dtype], wxy.x , wxy.y )             
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
                let { cs, x, y, as } = fallings[ j ]
                let wxy = world_to_context( x, y )
                putSprite( Images.plane_hit[cs][as], wxy.x , wxy.y )
                if (Math.random()>0.8){
                    if ( Math.random()>0.5){
                        trailPoints.add( x + 8, y + 8,'#88888', 5, 4 )
                    } else {
                        trailPoints.add( x + 8, y + 8,'#a8888', 3, 2 )
                    }
                }

            }
        }
        const leavings = State.leavings
        if (leavings){
            for ( let j = 0, ll = leavings.length ; j < ll ; j++ ){
                let { cs, x, y, as } = leavings[ j ]
                let wxy = world_to_context( x, y )
                putSprite( Images.plane_win[cs][as], wxy.x , wxy.y )             
            }
        }
        const oxs = State.oxs
        if (oxs){
            for ( let j = 0, ll = oxs.length ; j < ll ; j++ ){
                let { x, y, as } = oxs[ j ]
                //  y ?
                // let y =  ground[ Math.floor( x ) % ground.length ]
                let wxy = world_to_context( x, y )
                putSprite( Images.ox[as], wxy.x , wxy.y )             
            }
        }
        const showcolls = State.showcolls
        if ( showcolls ){
            showcolls.forEach( showcoll => {
                const {l,r,b,t} = showcoll
                let wxy1 = world_to_context( l, t )
                let wxy2 = world_to_context( r, b )
                let w = Math.abs( wxy2.x - wxy1.x )
                let h = Math.abs( wxy2.y - wxy1.y )
                $context.fillStyle = 'red'
                $context.fillRect(wxy1.x,wxy1.y,w,h)
            })
        }
        const showtreecells = State.showtreecells
        if ( showtreecells ){
            showtreecells.forEach( showtreecell => {
                
                const {ox,oy,w,h} = showtreecell
                let wxya = world_to_context( ox, oy )
                let wxyb = world_to_context( ox + w, oy + h )
                let wxy1 = { x: wxya.x, y : wxyb.y }
                let wxy2 = { x: wxyb.x, y : wxya.y }
                let h1 = Math.abs( wxy2.y - wxy1.y )

                $context.strokeStyle = 'rgba(0,255,0,0.1)'
                $context.strokeRect(wxy1.x,wxy1.y,w,h1)
                
                
            })
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
