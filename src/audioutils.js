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

// introsp ?
// AudioNodeOptions
// AudioParam

const mixer2module = {
    name : 'mixer2module',
    audioNodes : {
        in1 : { node : 'gain' },
        in2 : { node : 'gain' }
    },
    outputs : ['in1','in2'],
    connections : []
}
// def
const module1 = {
    name : 'module1',
//    input : ['osc1'],
    outputs : ['gain1'],
    audioNodes : {
        osc1 : { node : 'oscillator' },
        comp1 : { node : 'dynamicsCompressor' },
        gain1 : { node : 'gain' }
    },
    connections : [
        ['osc1#0','comp1','gain1'],
    ]
}
const recmodule = {
    name : 'recmodule',
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

// synth helpers
function creatorName( nodeName ){
    let head = nodeName.substring(0,1).toUpperCase()
    let tail = nodeName.substring(1)
    return `create${ head  }${ tail }`
}

let _id = 1
function id(){
    return _id++
}
function modulePath( path ){
    return path.replace(/#\d+$/,'')
}
function portPath( path ){
    if ( path ){
        let idx = path.lastIndexOf( '#' )
        if ( idx >= 0 ){
            return path.substring( idx )
        }
    }
} 
function resolvePath( o, path ){
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

function instanciateModule( ctx, module, name ){

    const instance = {
        isModule : true,
        model : module,
        id : id(),
        nodes : [],
        inputs : [],
        outputs : [],
        connect : undefined,
        start : undefined,
        connections : [],
    }
    const nodes = []
    for ( let handle in module.audioNodes ){
        const desc = module.audioNodes[ handle ]
        if ( desc.node ){
            const nname = desc.node
            const fname = creatorName( nname )
            const node = ctx[ fname  ]()
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
    return instance

}
waitAudioContext()
    .then( ctx => {
        const whole = instanciateModule( ctx, recmodule )
               
        console.log('whole',whole)

        whole.connect( ctx.destination )
        whole.start()
        setTimeout( () => {
            whole.stop()
        },500)

        /*
          const path = 'odg1.comp1'
          console.log('for path', path, ':',resolvePath( whole, path ))
        */
            
    })

