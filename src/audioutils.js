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
        ['osc1','comp1','gain1'],
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
function creatorName( nodeName ){
    let head = nodeName.substring(0,1).toUpperCase()
    let tail = nodeName.substring(1)
    return `create${ head  }${ tail }`
}

let _id = 1
function id(){
    return _id++
}
function resolvePath( o, path ){
    // console.log('require path',path,'on',o)
    if ( ! path ) return
    if ( ! o ) return
    const oo = path.split('.').reduce( (r,x,i) => {
        return r.nodes[ x ]
    },o)
    // console.log('found for path',path,oo)
    return oo
}

function instanciateModule( ctx, module, name ){
    console.log('= instance', module.name )

    const instance = {
        isModule : true,
        model : module,
        id : id(),
        nodes : [],
        inputs : [],
        outputs : [],
        connect : undefined,
        start : undefined
    }
    const nodes = []
    for ( let handle in module.audioNodes ){
        console.log('*', module.name, 'has handle',handle)
        const desc = module.audioNodes[ handle ]
        if ( desc.node ){
            const nname = desc.node
            const fname = creatorName( nname )
            const node = ctx[ fname  ]()
            instance.nodes[ handle ] = node
        } else if ( desc.module ){
            console.log('~> going to', handle )
            const md = desc.module
            instance.nodes[ handle ] = instanciateModule( ctx, md )
        }
    }
    console.log('~> back at', module.name )
    if ( module.outputs ){
        module.outputs.forEach( handle => {
            instance.outputs.push( instance.nodes[ handle ] )
            console.log('>output',handle)
        })
    }
    if ( module.inputs ){
        module.inputs.forEach( handle => {
            instance.inputs.push( instance.nodes[ handle ] ) 
            console.log('>input',handle)
       })
    }
    instance.connect = function( dst ){
        instance.outputs.forEach( src => {
            if ( dst.isModule ){
                // the destination is a module
                dst.inputs.forEach( dst => {
                    src.connect( dst )
                })
            } else {
                // the destination is a web audio node
                src.connect( dst )
            }
        })
        return dst
    }
    if ( module.connections ){
        module.connections.forEach( cons => {
            console.log('setting connexions for',module.name,':',cons)
            if ( cons ) {
                cons.reduce( (r,x) => {
                    if ( r !== undefined ){
                        const src = resolvePath(instance,r)
                        const dst = resolvePath(instance,x)
                        console.log('<-> connect',{src,dst})
                        src.connect( dst )
                    }
                    return x
                },undefined)
            }
        })
    }
    instance.start = function(){
        Object.values( instance.nodes ).forEach( node => {
            if ( node.isModule ){
                console.log('start module',node)
            } else {
                console.log('start WEBAUDIO module',node)
            }
            if ( node.start ) node.start()
        })
    }
    return instance

}
waitAudioContext()
    .then( ctx => {
        /*
        const mod1 = instanciateModule( ctx,  module1 )
        {
            mod1.nodes.osc1.type = 'square'
            mod1.start()
        }
        const mod2 = instanciateModule( ctx,  module1 )
        {
            mod2.nodes.osc1.type = 'sinus'
            mod2.start()
        }
        const mod3 = instanciateModule( ctx, mixer2module )
        mod1.connect( mod3.nodes.in1 )
        mod2.connect( mod3.nodes.in2 )
        mod3.connect(ctx.destination)
        
        
        setTimeout( () => {
            mod1.nodes.osc1.stop()
            mod2.nodes.osc1.stop()
        },200)
        */
        const whole = instanciateModule( ctx, recmodule )
        whole.connect( ctx.destination )
        whole.start()
        console.log(whole)
        
    })

