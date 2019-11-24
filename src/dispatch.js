export class Dispatcher {    
    constructor(){
        this.unique = undefined
        this.list = new Set()
        this.byType = {}
    }
    addUniqueListener( f ){
        this.unique = f
    }
    removeUniqueListener( f ){
        this.unique = undefined
    }
    addListener( f, type ){
        if ( this.unique )
            return        
        if ( type === undefined ){
            this.list.add( f )
        } else {
            if ( this.byType[ type ] === undefined ){
                this.byType[ type ] = new Set()
            }
            this.byType[ type ].add( f )
        }
    }
    removeListener( f, type ){
        if ( this.unique )
            return
        if ( type === undefined ){
            this.list.remove( f )
        } else {
            if ( this.byType[ type ] !== undefined ){
                this.byType[ type ].remove( f )
            }
        }
    }
   
    dispatch( msg, type ){
        if ( this.unique ){
            this.unique( msg, type )
        } 
        this.list.forEach( f => f( msg, type ) )
        if ( type !== undefined ){
            if ( this.byType[ type ] !== undefined ){
                this.byType[ type ].forEach( f => f( msg, type ) )
            }
        }
    }
    connectTo( ...args ){
        return this.addListener( ...args )
    }
    disconnect( ...args ){
        return this.removeListener( ...args )
    }
    
}

//

const propertyImpl = {
    attachDispatcher( o ){
        if ( o.dispatcher === undefined ){
            o.dispatcher = new Dispatcher()
        }
        return o.dispatcher
    },
    getDispatcher( o ){
        return o.dispatcher
    }
}

const dispatchers = new WeakMap()
const weakMapImpl = {
    attachDispatcher( o ){
        let d = dispatchers.get( o )
        if ( d === undefined ){
            const d2 = new Dispatcher()
            dispatchers.set( o, d2 )
            return d2
        } else {
            return d
        }
    },
    getDispatcher( o ){
        return dispatchers.get( o )
    }
}

function build( impl ){
    const attachDispatcher = impl.attachDispatcher
    const getDispatcher = impl.getDispatcher
    return {
        connectUniqueTo( x, y, type ){
            attachDispatcher( x ).addUniqueListener( y )
        },
        disconnectUniqueTo( x, y, type ){
            attachDispatcher( x ).removeUniqueListener( y )
        },
        connectTo( x, y, type ){
            attachDispatcher( x ).addListener( y, type )
        },
        disconnectTo( x, y, type ){
            let d = getDispatcher( x )
            if ( d ){
                d.removeListener( y, type )
            }
        },
        dispatch( y, msg, type ){
            let d = getDispatcher( y )
            if ( d ){
                d.dispatch( msg, type )
            }
        }
    }
}

export const wm = build( weakMapImpl )
export const prop = build( propertyImpl )

////////////////
////////////////

// const { connectTo, disconnectTo, dispatch } = prop

// class PS {
//     constructor( name ){
//         this.name = name
//     }
// }
// class PQ {
//     constructor( name ){
//         this.name = name
//     }
//     onMessage( msg ){
//         console.log('got message',msg)
//     }
// }
// class PQ2 {
//     constructor( name ){
//         this.name = name
//     }
//     onMessage( msg ){
//         console.log('XXgot message2',msg)
//     }
// }

// let ps = new PS('bob')
// let pq = new PQ('pap')
// let pq2 = new PQ2('pip')
// connectTo( ps, msg => pq.onMessage( msg ) )
// connectTo( ps, msg => pq2.onMessage( msg ), 'MSGTYPE2' )

// console.log('===',ps,pq)

// dispatch( ps, 'MON MESSAGE' )
// dispatch( ps, 'MON MESSAGE2' , 'MSGTYPE2' )

