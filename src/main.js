import { ground } from './ground.js'
import { prepareImages } from './symbols.js'

function posmod(n,m) {
    return ((n%m)+m)%m;
};

const Images = prepareImages()

console.log('ok',ground)

const $canvas = document.createElement('canvas')
$canvas.width = 640
$canvas.height = 200
document.body.appendChild( $canvas )
const $context = $canvas.getContext('2d')

/*function getRandomColor() {
  var letters = '0123456789ABCDEF';
  var color = '#';
  for (var i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
  }*/

const State = {
    plane : {
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
        })),
                                        
    },
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
        ]
    }
}

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
    default : console.log(code)
    }
})

function clamp( x, a, b ){
    return Math.max(a,Math.min(x,b))
}
function placetargets(){
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
        ///let ty = tys[ i ]
        //let wxy = world_to_context( x, meany )
        //$context.drawImage( Images.trg[ty], wxy.x , wxy.y - 8)
    }
    
}
placetargets()

function display(){
    
    const { x, y, r, a, p, bombs } = State.plane
    const { xs, tys } = State.targets

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
        $context.fillRect(i,
                          cxy.y,
                          1,
                          $canvas.height - cxy.y
                         )
        }
       
    }
    // targets
    $context.fillStyle = 'black'
    for ( let i = 0 ; i < xs.length ; i++ ){
        let x = xs[ i ]        
        let y = ground[ Math.floor( x ) % ground.length ]
        let ty = tys[ i ]
        let wxy = world_to_context( x, y )
        $context.drawImage( Images.targets[ty], wxy.x  , wxy.y - 16)
    }
    $context.fillStyle = 'black'
    
    //let va = Math.floor(posmod(a, 2 * Math.PI) / ( 2 * Math.PI ) * 16 )
    let va = a
    let vr = r?1:0
    //$context.putImageData( Images.pln[vr][va], $canvas.width/2, $canvas.height/2)
    let wxy = world_to_context( x, y )

    $context.drawImage( Images.plane[vr][va], wxy.x - 8 , wxy.y - 8 )
    
    $context.fillStyle = 'white'
    $context.font = "10px monospace";
    $context.fillText(`${Math.floor(x)},${Math.floor(y)},${p}`,
                      wxy.x + 8 , wxy.y + 18 )



    // bombs
    
    for ( let i = 0, l = bombs.length ; i < l ; i++ ){        
        const bomb = bombs[i]
        const { x, y, a, p, ttl } = bomb
        if ( ttl > 0 ){
            let wxy = world_to_context( x, y )
            $context.drawImage( Images.bomb[a], wxy.x - 8 , wxy.y - 8 )
        }
    }
    
//    displayGround()
  //  display
    
    
}

function animate(){
    requestAnimationFrame( animate )
    display()
}
animate()
function handleinputs(){
    const { x, y, r, a, p } = State.plane
    let dda = 0
    let reverse = 0
    let dds = 0
    while ( inputs.length ){
        const input = inputs.shift()
        switch ( input ){
         case 'noseup' : dda = 1 ; break
         case 'nosedown' : dda = -1 ; break
         case 'reverse' : reverse = 1 ; break
         case 'powerup' : dds = 1 ; break
         case 'powerdown' : dds = -1 ; break
        }
    }
    let da = dda
    State.plane.a = posmod( a + da, 16 )
    if ( reverse ){
        State.plane.r = !(State.plane.r)
    }
    let ds = dds
    State.plane.p = clamp( State.plane.p + ds, 0, 4)
}

const directions16 = new Array( 16 ).fill(0)
      .map( (_,i) => ( i * 2 * Math.PI / 16 ) )
      .map( x => [ Math.cos( x ), Math.sin( x ) ] )

const directions8 = new Array( 8 ).fill(0)
      .map( (_,i) => ( i * 2 * Math.PI / 8 ) )
      .map( x => [ Math.cos( x ), Math.sin( x ) ] )

const toFall8 = [7,0,6,4,5,6,6,6]
function moveplane(){
    
}
function move(){
    const { x, y, r, a, p, bombs } = State.plane
    let dx = directions16[ a ][ 0 ] * p * 2
    let dy = directions16[ a ][ 1 ] * p * 2
    State.plane.x = x + dx
    State.plane.y = y + dy
    if ( State.plane.y > 420 ){
        State.plane.a = 12
//        State.plane.r = !(State.plane.r)
        
    }
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
    }
    
}
function gameloop(){
    window.setInterval( () => {
        handleinputs()
        move()
    },40)//1000/10)//20)
}

gameloop()
