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

let _id = 1
function id(){
    return _id++
}

function creatorName( nodeName ){
    let head = nodeName.substring(0,1).toUpperCase()
    let tail = nodeName.substring(1)
    return `create${ head  }${ tail }`
}
function createWebAudioNode( ctx, { node, c = [], p = {}, f } ){
    // create with optional parameters
    const waNode = ctx[ creatorName( node )  ]( ...c  )
    // set attributes
    Object.keys( p ).forEach( k => { waNode[ k ] = p[ k ] } )
    // apply custom f
    if ( f ){ f( waNode ) }
    return waNode
}
function getWebAudioNodeAudioParams( wan ){
    // inspect wan properties for AudioParams
    const waps = {}
    for ( let propname in wan ){
        const maybeAp = wan[propname]
        if ( maybeAp instanceof AudioParam ){
            waps[ propname ] = maybeAp
        }
    }
    return waps
}
function getConnectionPairs( module ){
    // [ [a,b,c], [d,e] ] -> [a,b],[b,c],[d,e]
    const pairs = []
    if ( module.connections ){
        module.connections.filter( numplet => numplet.length > 1 ).forEach( nuplet => {
            nuplet.reduce( (r,x) => {
                if ( r !== undefined ){
                    pairs.push([r,x])
                }
                return x
            },undefined)
        })
        return pairs;
    }
}
function getWanOutputs( src, audioNodes, modules, accum = [] ){
    if ( audioNodes[ src ] ){
        accum.push( src )    
    } else {
        const module = modules[ src ]
        if ( module &&  module.outputs ){
            module.outputs.forEach(
                x => getWanOutputs( [src,x].filter( x => x ).join('.'), audioNodes, modules, accum )
            )
        }
    }
    return accum
}
function getWanInputs( src, audioNodes, modules, accum = [] ){
    if ( audioNodes[ src ] ){
        accum.push( src )    
    } else {
        const module = modules[ src ]
        if ( module &&  module.inputs ){
            module.inputs.forEach(
                x => getWanInputs( [src,x].filter( x => x ).join('.'), audioNodes, modules, accum )
            )
        }
    }
    return accum
}
function walkModule( module, f, path = [] ){
    f(module, path)
    if ( module.nodes ){
        Object.entries( module.nodes ).forEach( ([h,def]) => {
            const entryPath = [ ...path, h ]
            if ( def.module ){
                walkModule( def.module, f, entryPath )
            } else {
                f(def,entryPath)
            }
        })
    }
}
function instanciateModule( ctx, module ){
    const waNodes = {}
    const waParams = {}
    const moduleNodes = {}
    const connections = []
    const waConnections = []
    walkModule( module, (module,path) => {
        const strPath = path.join('.')
        if ( module.node ){
            const wan = createWebAudioNode( ctx, module )
            waNodes[ strPath  ] = wan
            const aps = getWebAudioNodeAudioParams( wan )
            Object.entries( aps ).forEach( ( [ pname, ap ] ) => {
                const paramPath = [ strPath, pname ].join('/')
                waParams[ paramPath ] = ap
            })
        } else {
            const wan = 0
            moduleNodes[ strPath ] = module
            getConnectionPairs( module ).forEach( ([src,dst]) => {
                connections.push( { src : [ strPath, src ].filter( x => x).join('.'),
                                    dst : [ strPath, dst ].filter( x => x).join('.') })
            })
        }        
    })
    connections.forEach( ( { src, dst } ) => {
        const wansrc = getWanOutputs( src, waNodes, moduleNodes )
        const wandst = getWanInputs( dst, waNodes, moduleNodes )
        wansrc.forEach( s => wandst.forEach( d => waConnections.push( [s,d] ) ) )
    })
    function doInnerConnections(){
        waConnections.forEach( ([src,dst]) => {
            waNodes[ src ].connect( waNodes[ dst ] )
        })
    }
    function doStart(){
        Object.values( waNodes ).forEach( wan => {
            if ( wan.start ){
                wan.start()
            }
        })
    }
    return {
        audioNodes : waNodes,
        audioParams : waParams,
        audioConnections : waConnections,
        modules : moduleNodes,
        connections : connections,
        audioOutputs : getWanOutputs( '', waNodes, moduleNodes ).map( x => waNodes[ x ] ),
        audioInputs : getWanInputs( '', waNodes, moduleNodes ).map( x => waNodes[ x ] ),
        start : () => {
            doInnerConnections()
            doStart()
        },
        audioParam : path =>  waParams[ path ]
    }

}

/////////////
/////////////
function example( ctx, wavetable ){

    function monoWhiteNoiseBuffer( duration ){
        const bufferSize = ctx.sampleRate * duration
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
        let data = buffer.getChannelData(0)
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        return buffer
    }

    function setPeriodicWavef( wavetable ){
        const wave = ctx.createPeriodicWave(
            new Float32Array(wavetable.real),
            new Float32Array(wavetable.imag)
        )
        return function( node ){
            node.setPeriodicWave( wave )
        }
    }
    function setupCompressor( dynamicsCompressorNode ){
        const c = dynamicsCompressorNode
        c.knee.setValueAtTime(40, ctx.currentTime);  // [ 0, 40 ] 30
        c.ratio.setValueAtTime(12, ctx.currentTime); // [ 1, 20 ] 12
        c.attack.setValueAtTime(0, ctx.currentTime);
    }
    const periodicWaveOscillatorGain = {
        nodes : {
            osc : { node : 'oscillator' , f : setPeriodicWavef( wavetable ) },
            gain : { node : 'gain' }
        },
        connections : [ ['osc','gain'] ],
        outputs : [ 'gain' ]    
    }
    const whiteNoiseBandPassGain = {
        nodes : {
            whitenoise : { node : 'bufferSource', p : {
                buffer : monoWhiteNoiseBuffer(1),
                loop : true
            }},
            bandpass : { node : 'biquadFilter', p : { type : 'bandpass' } },
            gain : { node : 'gain' },
        },
        connections: [['whitenoise','bandpass','gain']],
        outputs : ['gain']
    }
    const compressorGain = {
        nodes : {
            pre : { node : 'gain' },
            compressor : { node : 'dynamicsCompressor', f : setupCompressor },
            post : { node : 'gain' },
        },
        connections: [['pre','compressor','post']],
        inputs : [ 'pre'],
        outputs : [ 'post' ]
    }
    const brahoum = {
        nodes : {
            noise : { module : whiteNoiseBandPassGain },
            compression : { module : compressorGain }
        },
        connections : [['noise','compression']],
        outputs : ['compression']
    }

    /*
      const mixer2module = {
      nodes : {
      in1 : { node : 'gain' },
      in2 : { node : 'gain' }
      },
      outputs : ['in1','in2'],
      }  
    */
    let m = instanciateModule( ctx, brahoum )
    m.audioOutputs.forEach( wan => wan.connect( ctx.destination ) )
    m.start()
    console.log( Object.keys( m.audioParams ).join("\n") )
    m.audioParam('compression.post/gain').linearRampToValueAtTime(0, ctx.currentTime + 5)
    
    // occurs between previous scheduled event and <endTime>
    // var AudioParam = AudioParam.linearRampToValueAtTime(value, endTime)
    // var AudioParam = AudioParam.exponentialRampToValueAtTime(value, endTime)
    
    // occurs at <startTime>
    // var AudioParam = AudioParam.setValueAtTime(value, startTime)
    // var AudioParam = AudioParam.setTargetAtTime(target, startTime, timeConstant);  
    // var AudioParam = AudioParam.setValueCurveAtTime(values, startTime, duration);
    
    // var AudioParam = AudioParam.cancelScheduledValues(startTime)
    // var audioParam = AudioParam.cancelAndHoldAtTime(cancelTime)

}

/**/
const GOOD = ["Wurlitzer","Brit_Blues"]
function nameToUrl( name ){
    const url = ['','wave-tables',name].join('/')
    return url
}
function fetchWaveTable( url ){
    return fetch( url )
        .then( x => x.text() )
        .then( x => x.replace(/\s/g,'')
               .replace(/'/g, '"')
               .replace(/'/g, '"') 
               .replace(/,]/g, ']') 
               .replace(/,}/g, '}') )
        .then( JSON.parse )
        .catch( x => console.error( 'bad wavetable', url ) )
}
function fetchWaveTables(){
    return Promise
        .all( GOOD.map( nameToUrl  ).map( fetchWaveTable ) )
        .then( all => all.reduce( (r,x,i) => {
            r[ GOOD[ i ] ] = x
            return r
        },{}) )
}
/**/
Promise
    .all( [ fetchWaveTables(),  waitAudioContext() ] )
    .then( ([ wavetables, ctx ]) => {
        example( ctx, wavetables.Wurlitzer )
    })
