export function waitAudioContext( checkInterval = 500 ){

    const AudioContext = window.AudioContext || window.webkitAudioContext;
    
    return new Promise( resolve => {        
        
        const ctx = new AudioContext();
        
        ctx.onstatechange = running

        function running(){
            if ( ctx.state === 'running' ){
                ctx.onstatechange = undefined
                console.info('Audio Context is now running')
                resolve( ctx )
            }
        }
        function check(){
            if ( ctx.state !== 'running' ){
                ctx.resume()
                setTimeout( check, checkInterval )
            }
        }

        check()
        
    })
}

// synth helpers

// introsp ?
// AudioNodeOptions
// AudioParam

function modulePath( path ){
    return path.replace(/#\d+$/,'')
}
export function portPath( path ){
    if ( path ){
        let idx = path.lastIndexOf( '#' )
        if ( idx >= 0 ){
            return path.substring( idx )
        }
    }
} 
export function resolvePath( o, path ){
    if ( ! path ) return
    if ( ! o ) return
    return modulePath( path ).split('.').reduce( (r,x,i) => {
        if ( r && r.nodes && r.nodes[ x ] ){
            return r.nodes[ x ]
        } else {
            throw new Error(`bad path ${ path } : ${ x }`)
        }
    },o)
}

function creatorName( nodeName ){
    let head = nodeName.substring(0,1).toUpperCase()
    let tail = nodeName.substring(1)
    return `create${ head  }${ tail }`
}
let _id = 1
function id(){
    return _id++
}
export function instanciateModule( ctx, module ){

    const instance = {
        isModule : true,
        model : module,
        id : id(),
        nodes : [],
        inputs : [],
        outputs : [],
        connect : undefined,
        start : undefined,
        get : undefined,
        connections : [],
    }
    const nodes = []
    for ( let handle in module.audioNodes ){
        const desc = module.audioNodes[ handle ]
        if ( desc.node ){
            const nname = desc.node
            const cparams = desc.cparams || []
            const fname = creatorName( nname )
            const node = ctx[ fname  ]( ...cparams  )
            const params =  desc.params || {}
            Object.keys( params ).forEach( k => {
                node[ k ] = params[ k ]
            })
            instance.nodes[ handle ] = node
        } else if ( desc.module ){
            const md = desc.module
            instance.nodes[ handle ] = instanciateModule( ctx, md )
        }
    }
    if ( module.outputs ){
        module.outputs.forEach( handle => {
            instance.outputs.push( instance.nodes[ handle ] )
        })
    }
    if ( module.inputs ){
        module.inputs.forEach( handle => {
            instance.inputs.push( instance.nodes[ handle ] ) 
        })
    }
    instance.connect = function( dst, outputIndex, inputIndex ){
        instance.outputs.forEach( src => {
            if ( dst.isModule ){
                // the destination is a module
                dst.inputs.forEach( dst => {
                    src.connect( dst, outputIndex, inputIndex )                    
                })
            } else {
                // the destination is a web audio node
                src.connect( dst, outputIndex, inputIndex )
            }
        })
        return dst
    }
    if ( module.connections ){
        module.connections.forEach( cons => {
            if ( cons ) {
                cons.reduce( (r,x) => {
                    if ( r !== undefined ){
                        const src = resolvePath( instance, r )
                        const dst = resolvePath( instance, x )
                        const srcPort = portPath( r )
                        const dstPort = portPath( x )
                        instance.connections.push( {
                            src : { path : r, instance : src },
                            dst : { path : x, instance : dst },
                        } )
                        src.connect( dst, srcPort, dstPort )
                    }
                    return x
                },undefined)
            }
        })
    }
    instance.start = function( stop = false ){
        Object.values( instance.nodes ).forEach( node => {
            if ( stop ){
                if ( node.stop ) node.stop()
            } else {
                if ( node.start ) node.start()
            }
        })
    }
    instance.stop = () => instance.start( true )
    instance.get = path => resolvePath( instance, path )
    return instance

}

/////////////
/////////////
function example(){
    // def
    const mixer2module = {
        audioNodes : {
            in1 : { node : 'gain' },
            in2 : { node : 'gain' }
        },
        outputs : ['in1','in2'],
    }
    const module1 = {
        audioNodes : {
            osc1 : { node : 'oscillator', params : { type : 'square' } },
            comp1 : { node : 'dynamicsCompressor' },
            gain1 : { node : 'gain' }
        },
        connections : [
            ['osc1','comp1','gain1'],
        ],
        outputs : ['gain1'],
    }
    const recmodule = {
        audioNodes : {
            odg1 : { module : module1 },
            odg2 : { module : module1 },
            m : { module : mixer2module }
        },
        connections : [
            ['odg1','m.in1'],
            ['odg2','m.in2']
        ],
        outputs : ['m']
    }

    waitAudioContext()
        .then( ctx => {
            const synth = instanciateModule( ctx, recmodule )
            
            console.log('synth',synth)

            synth.connect( ctx.destination )
            synth.start()

            const in1 = resolvePath( synth, 'm.in1' )
            const in2 = synth.get( 'm.in2' )
            console.log('path in1',in1.gain.setValueAtTime(0.5,ctx.currentTime))
            console.log('path in2',in2.gain.setValueAtTime(0,ctx.currentTime))
            synth.get( 'odg1.osc1' ).type = 'square'
            synth.get( 'odg2.osc1' ).type = 'triangle'
            setTimeout( () => {
                synth.stop()
            },500)

            
        })

}
