// The "current" state will always be RENDER_DELAY ms behind server time.
// This makes gameplay smoother and lag less noticeable.
const RENDER_DELAY = 150

const gameUpdates = [];
let gameStart = 0;
let firstServerTimestamp = 0;

export function initState() {
    gameStart = 0;
    firstServerTimestamp = 0;
}
/*function saveOneTimeEvents( update ){
    oneTimeEvents.length = 0
    if ( !update) return
    if ( update.bombs ){
        update.bombs.forEach( x => {
            if ( x.justfired ){
                oneTimeEvents.push( x )
                //console.log('bomb')
            }
        })
        update.missiles.forEach( x => {
            if ( x.justfired ){
                oneTimeEvents.push( x )
            }
        })
    }               

}*/
export function processGameUpdate(update) {

   // saveOneTimeEvents( update )
    
    if (!firstServerTimestamp) {
        firstServerTimestamp = update.t;
        gameStart = Date.now();
    }
    gameUpdates.push(update);
    // updateLeaderboard(update.leaderboard);

    // Keep only one game update before the current server time
    const base = getBaseUpdate();
    if (base > 0) {
        gameUpdates.splice(0, base);
    }
}

function currentServerTime() {
    return firstServerTimestamp + (Date.now() - gameStart) - RENDER_DELAY;
}

// Returns the index of the base update, the first game update before
// current server time, or -1 if N/A.
function getBaseUpdate() {
    const serverTime = currentServerTime();
    for (let i = gameUpdates.length - 1; i >= 0; i--) {
        if (gameUpdates[i].t <= serverTime) {
            return i;
        }
    }
    return -1;
}

export function getCurrentState() {

    if (!firstServerTimestamp) {
        return {};
    }
    
    const base = getBaseUpdate();
    const serverTime = currentServerTime();

    // If base is the most recent update we have, use its state.
    // Otherwise, interpolate between its state and the state of (base + 1).
    if (base < 0 || base === gameUpdates.length - 1) {
        const update = gameUpdates[gameUpdates.length - 1]
        return update
        
    } else {
        const baseUpdate = gameUpdates[base];
        const next = gameUpdates[base + 1];
        const ratio = (serverTime - baseUpdate.t) / (next.t - baseUpdate.t);
        if ( ratio < 0.5 ){
            return interpolateState( baseUpdate, next, ratio )
        } else {
            return interpolateState( next, baseUpdate, ( 1 - ratio ) )
        }
    }
}
function linearInterpolation( v1, v2, ratio ){
    let d = ( v2 - v1 )
    if ( ( d > 16 ) || ( d < -16 ) ){
        // todo...
        return v2
    } else {
        return v1 + ( v2 - v1 ) * ratio
    }
}
function a816Interpolation( v1, v2, ratio ){
    if ( ratio > 0.5 ){
        return v2
    } else {
        return v1
    }
}
function interpolateState( s1, s2, ratio ){

    const keys = Object.keys( s1 )

    // copy state 1
    const state = JSON.parse( JSON.stringify( s1 ) )

    // interpolate when possible
    Object.entries( state ).forEach( ( [ ka, va ] ) => {
        
        const vb = s2[ ka ]

        if ( vb === undefined ) {
            return
        }

        if ( ka === 'ground' ){
            va.forEach( ( h1, i ) => {
                const h2 = va[ i ]
                if ( h2 !== undefined ){
                    va[ i ] = linearInterpolation( h1, h2, ratio )
                }
            })
            return
        }
        if ( ka ==='justfired' ){
            // use only one time
            state[ ka ] = va.map( x => x )

            // so remove from saved state
            s1[ ka ] = []
            return
        }

        if ( Array.isArray( va ) ){
            va.forEach( ( item1, i ) => {

                if ( item1.id === undefined )
                    return
                
                const item2 = vb.find( ({id}) => ( id === item1.id ) )
                if ( item2 === undefined )
                    return

                ;['x','y'].forEach( propk => {
                    const pv1 = item1[ propk ]
                    const pv2 = item2[ propk ]
                    if ( ( pv1 !== undefined ) && ( pv2 !== undefined ) ){
                        item1[ propk ] = linearInterpolation( pv1, pv2, ratio )
                    }
                })
                ;['a'].forEach( propk => {
                    const pv1 = item1[ propk ]
                    const pv2 = item2[ propk ]
                    if ( ( pv1 !== undefined ) && ( pv2 !== undefined ) ){
                        item1[ propk ] = a816Interpolation( pv1, pv2, ratio )
                    }
                })
            })
        }
    })
        
    return state
    
}
