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
        return interpolateState( baseUpdate, next, ratio )
    }
}
function linearInterpolation( v1, v2, ratio ){
    let d = ( v2 - v1 )
    if ( ( d > 16 ) || ( d < -16 ) ){
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
    const state = {}
    Object.keys( s2 ).forEach( (k2,i2) => {
        // planes, debris...
        let vs2 = s2[ k2 ]
        let copy_cs2
        if ( vs2.length ){
            if ( k2 === 'justfired' ){
                copy_cs2 = vs2.concat( s1[ k2 ] )
            } else  if ( k2 === 'ground' ){
                copy_cs2 = vs2.map( (h2,ig2) => {
                    let h1 = s1.ground[ ig2 ]
                    return linearInterpolation( h1, h2, ratio )
                })
            } else {
                copy_cs2 = vs2.map( (vsk2,vi2) => {
                    let item = Object.assign({}, vsk2)
                    if ( s1[ k2 ] ){
                        let vsk1 = s1[ k2 ][ vi2 ]
                        if ( vsk1 ){
                            //if ( ( vsk1.ttl === undefined ) || ( vsk1.ttl >= 0 ) ){
                            if ( (item.x!==undefined) && (item.y!==undefined) ){
                                item.x = linearInterpolation( vsk1.x, vsk2.x, ratio )
                                item.y = linearInterpolation( vsk1.y, vsk2.y, ratio )                                
                            }
                            if ( (item.a!==undefined) ){
                                item.a = a816Interpolation( vsk1.a, vsk2.a, ratio )
                            }
                            //item.justfired = item.justfired || vsk1.justfired
                        }
                    }
                    return item
                    //}
                })
            }
            state[ k2 ] = copy_cs2
        } else {
            state[ k2 ] = vs2
        }
    })
    return state
}
