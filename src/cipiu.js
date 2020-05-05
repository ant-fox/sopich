export function ia( State, options ){

    const SHOOT_PROBABILITY = 0.5
    
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
                if ( Math.random() < SHOOT_PROBABILITY ) {
                    if (! options.IA_DOES_NOT_FIRE ){
                        if ( Math.random() > 0.6 ){
                            pushButton('firemissile')
                        } else {
                            if ( Math.random() > 0.5 ){
                                pushButton('firebomb')
                            } else {
                                pushButton('fireguidedmissile')
                            }
                        }
                    }
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
            /*
            if ( i > 0 ){
                ia1( State.planes[ i ], State.planes[ i - 1 ],3000 )
            }
            */
            
            if (!options.IA_JUST_FLIES_AROUND){
                if ( !(i%2) ){
                    ia1( State.planes[ i ], State.planes[ 0 ], 300)
                } else {
                    ia1( State.planes[ i ], State.planes[ i - 1 ],2000 )
                }
            }
            
        }
    })
    
}
