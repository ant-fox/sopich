import { waitAudioContext, fetchWaveTable, instanciateModule, readPart } from './audioutils.js'
import { dist, sqdist, clamp } from './utils.js'
function format( a,b,c,d ){
    const nf = Intl.NumberFormat( 'en-EN', {
        minimumIntegerDigits : a,
        maximumIntegerDigits : b,
        minimumFractionDigits : c,
        maximumFractionDigits : d
    })
    return x => nf.format(x)
}
const format12 = format(1,1,2,2) 
const format14 = format(1,1,4,4)
const format18 = format(1,1,8,8)
   
// wave-tables
function fetchWaveTables( wavetableNames ){
    return Promise
        .all( wavetableNames.map( wavetableUrl ).map( fetchWaveTable ) )
        .then( all => all.reduce( (r,x,i) => {
            r[ wavetableNames[ i ] ] = x
            return r
        },{}) )
}
const wavetableNames = ["Wurlitzer","Brit_Blues"]
function wavetableUrl( name ) { return ['','wave-tables',name].join('/') }

// buffers
function prepareBuffer( ctx, duration, f ){
    const bufferSize = ctx.sampleRate * duration
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    let data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) {
        data[i] = f(i)
    }
    return buffer
}
function whiteNoiseBuffer( ctx ){
    return prepareBuffer( ctx, 1, i => Math.random() * 2 - 1 )
}
function diracBuffer( ctx ){
    return prepareBuffer( ctx, 1/10, i => {
        return ( i === 0 )?1:0
    })
}
// synth
const model1 = {
    nodes : {
        osc1 : { node : 'oscillator', ap : { frequency : 400 }},
        osc2 : { node : 'oscillator', ap : { frequency : 20 }},
        gain : { node : 'gain' },
        fader : { node : 'gain', ap : { gain : 0 } },
    },
    connections : [
        ['osc1','gain'],
        ['osc2','gain/gain'],
        ['gain','fader']
    ],
    outputs : [ 'fader' ]
}
const model2 = {
    nodes : {
        noisegen : { node : 'bufferSource', buffer : 'whitenoise', p : { loop : true } },
        bandpass : { node : 'biquadFilter', p : { type : 'bandpass' }, ap : { Q : 0.01, frequency : 800 } }, 
        fader : { node : 'gain', ap : { gain : 0 } },
    },
    connections : [
        [ 'noisegen', 'bandpass', 'fader' ]
    ],
    outputs : ['fader']
}
const model3 = {
    nodes : {
        osc1 : { node : 'oscillator', wavetable : 'Brit_Blues' },
        fader : { node : 'gain', ap : { gain : 0 } },
    },
    connections : [ ['gain','fader'] ],
    outputs : [ 'fader' ]
}
const model4 = {
    nodes : {
        gen : { node : 'bufferSource', buffer : 'dirac', p : { loop : true } },
        fader : { node : 'gain', ap : { gain : 0 } },
    },
    connections : [
        [ 'gen', 'fader' ]
    ],
    outputs : ['fader']
}
const model = {
    nodes : {
        missilejustfired : { module : model2 },
        bombjustfired : { module : model4 }
    },
    outputs : ['missilejustfired','bombjustfired']
}
function Interpretor( synth ){

    const pixelPerMeter = 3
    const ctx = synth.ctx
    const Delay = 0.0    
    const firedState = {
        last : -1,
    }
    const fx = {        
        missile : {
            end : 0,
        },
        bomb : {
            end : 0,
        },
        explosion: {
            end : 0,
        }
    }
    
    function startfx( type, part, prefix ){
        if ( fx[type].end < ctx.currentTime ){ // ?
            const end = readPart( synth, part, ctx.currentTime + Delay, prefix )
            fx[type].end = end
        }
    }

    function setState( state ){

        const me = state.me
        if ( !me ) return
        if ( !( state[ me.type ] ) ) return

        const stereoFired = {
            bomb : [0,0],
            missile : [0,0],
            explosion : [0,0]
        }
        
        const playerItem = state[ me.type ][ me.idx ]
        if ( !playerItem ) return

        // reduce all justfired to stereo sum / squared distance
        let maxJustfiredNum = firedState.last
        state.justfired.forEach( justfired => {
            // we dont want to see the same event twice
            if ( justfired.num > firedState.last ){
                const side = ( playerItem.x > justfired.x )?0:1
                const rd = dist( playerItem, justfired )
                if ( rd < (100*100) ) {
                    const sd =  rd / pixelPerMeter
                    const invertsqdist = 1 / sd
                    stereoFired[ justfired.type ][ side ] += invertsqdist
                }
                //
                if ( justfired.num > maxJustfiredNum ){
                    maxJustfiredNum = justfired.num
                }
            }
        })
        firedState.last = maxJustfiredNum

        //
        
        if ( fx.missile.end < ctx.currentTime ){

            if ( stereoFired.missile[0] || stereoFired.missile[1] ){

                const vol = Math.pow(
                    0.3 + clamp(( stereoFired.missile[0] + stereoFired.missile[1] ),0,1),
                    0.5
                )
                
                const part = [
                    /*[ 0, 'fader/gain', 'cancel' ],
                      [ 0, 'bandpass/Q', 'cancel' ],
                      [ 0, 'bandpass/frequency', 'cancel' ],*/
                    [ 1, 'fader/gain', vol ],
                    [ 3, 'bandpass/Q', 4 ],
                    [ 3, 'bandpass/frequency', 400 ],
                    [ 7, 'bandpass/frequency', 800 ],
                    [ 10, 'fader/gain', 0 ],
                    [ 10, 'bandpass/Q', 1000 ],
                    [ 11, 'bandpass/frequency', 800 ],
                    [ 12, 'bandpass/frequency', 8000 ],
                    //[ 20, 'bandpass/Q', 0.02 ],
                ]
                
                const multf = 40
                const apart = part.map( ([ h, ...t ]) => ([ multf * h / 1000, ...t ]))
                startfx( 'missile', apart , 'missilejustfired' )
                
            }
        }
        if ( fx.explosion.end < ctx.currentTime ){
            
            
        }
        

        
        //     if ( state.explosions ){
        //         const explosions = state.explosions
        //         let total = 0
        //         explosions.forEach( explosion => {
        //             if ( explosion.justFired ){
        //                 const { type, num } = explosion.justFired
        //                 if ( ! num ){
        //                     console.log( num )
        
        //                 }
        //             }
        //             //console.log(explosion)
        //             //if ( explosion.justFired.type === 'explosion' ){
        //                 let sqd = dist( playerItem, explosion )
        //                 if (sqd < 1 ) sqd = 1
        //                 total += 1 / sqd
        //             //}
        //         })
        //         let ctotal = Math.pow( clamp( total, 0, 1 ), 0.5 )
        //         if ( ctotal < 0.1 ){
        //             ctotal = 0
        //         }
        //         /*console.log( Intl.NumberFormat( 'en-EN', {
        //             minimumIntegerDigits : 1,
        //             maximumIntegerDigits : 1,
        //             minimumFractionDigits : 3,
        //             maximumFractionDigits : 3,
        //         }).format(ctotal));                */
        //         s.audioParam('fader/gain').linearRampToValueAtTime(ctotal, ctx.currentTime + 0.1)
        //     } else {
        //         s.audioParam('fader/gain').linearRampToValueAtTime(0, ctx.currentTime + 0.1)
        //     }
    }

    return { setState }
}
// audio
export function Audio(){
    const audioState = {
        synth : undefined,
        interpretor : undefined,
        running : false,
        connected : false
    }
    function initialize(){
        Promise
            .all( [ waitAudioContext(), fetchWaveTables( wavetableNames ) ] )
            .then ( ( [ ctx, wavetables ] ) => {
                const buffers = {
                    whitenoise : whiteNoiseBuffer( ctx ),
                    dirac : diracBuffer( ctx )
                }
                const s = instanciateModule( ctx, model, { wavetables, buffers } )
                console.log('synth',s)
                audioState.interpretor = new Interpretor( s )
                s.start()
                audioState.synth = s
            })
    }
    function start(){
        audioState.running = true
        honorRunning()
    }
    function stop(){
        audioState.running = false
        honorRunning()
    }
    function honorRunning(){
        const s = audioState.synth
        if (!s) return
        const r = audioState.running
        const c = audioState.connected
        if ( r && (!c)) {
            s.connect( s.ctx.destination )
        } else if ( (!r) && c ) {
            s.disconnect( s.ctx.destination )
        }
        audioState.connected = r
    }
    function setState( state ){
        honorRunning()
        if ( !audioState.synth) return
        if ( !audioState.running ) return
        audioState.interpretor.setState( state )
    }

    initialize()
    return {
        setState,
        start,
        stop,
    }
}
// function Synth( ctx, wavetables ){
// function compressorGain(){
// // Create a compressor node
// const gain1 = ctx.createGain();
// gain1.gain.setValueAtTime( 20.0, ctx.currentTime )
// var compressor = ctx.createDynamicsCompressor();
// compressor.threshold.setValueAtTime(-80, ctx.currentTime); // [ - 100, 0 ] -24
// compressor.knee.setValueAtTime(40, ctx.currentTime); // [ 0, 40 ] 30
// compressor.ratio.setValueAtTime(12, ctx.currentTime); // [ 1, 20 ] 12
// compressor.attack.setValueAtTime(0, ctx.currentTime);
// compressor.release.setValueAtTime(0.25, ctx.currentTime);
// // compressor.reduction/*.setValueAtTime(0, ctx.currentTime) // [ 0, -20 ]
// const gain2 = ctx.createGain();
// gain2.gain.setValueAtTime( 0.8, ctx.currentTime )
// // connect the AudioBufferSourceNode to the destination
// gain1.connect(compressor).connect(gain2)
// //return { compressor, gain1, gain2 }
// return {
// gain1,
// compressor,
// connect : m => gain2.connect( m )
// }
// }
// let compressor = compressorGain()
// /*let compressor = {
// compressor : ctx.destination
// }*/
// function whiteNoiseBandPassGain(){
// let noiseDuration = 1;
// const bufferSize = ctx.sampleRate * noiseDuration
// const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
// let data = buffer.getChannelData(0)
// for (let i = 0; i < bufferSize; i++) {
// data[i] = Math.random() * 2 - 1;
// }
// let noise = ctx.createBufferSource();
// noise.buffer = buffer;
// noise.loop = true
// let bandHz = 200 // let bandpass = ctx.createBiquadFilter()
// bandpass.type = 'bandpass'
// bandpass.Q.value = 50 // 760
// bandpass.frequency.value = bandHz
// const gain = ctx.createGain();
// gain.gain.setValueAtTime( 0.5, ctx.currentTime )
// noise.connect( bandpass ).connect( gain )
// noise.start();
// return {
// noise,
// bandpass,
// gain,
// connect : m => gain.connect( m )
// }
// }
// function periodicWaveOscillatorGain( name ){
// const wavetable = wavetables[ name ]
// const wave = ctx.createPeriodicWave(new Float32Array(wavetable.real),
// new Float32Array(wavetable.imag));
// const osc = ctx.createOscillator();
// osc.frequency.setValueAtTime( 0.0, ctx.currentTime )
// osc.setPeriodicWave(wave);
// osc.start();
// const gain = ctx.createGain();
// gain.gain.setValueAtTime( 0.0, ctx.currentTime )
// osc.connect( gain )
// return {
// osc,
// gain,
// connect : m => gain.connect( m )
// }
// }
// const mainGain = ctx.createGain();
// mainGain.gain.setValueAtTime( 0.0, ctx.currentTime )
// mainGain.connect( ctx.destination )
// let engine = periodicWaveOscillatorGain('Wurlitzer')
// engine.connect( mainGain )
// let engine2 = periodicWaveOscillatorGain('Brit_Blues')
// engine2.connect( mainGain )
// let missile = whiteNoiseBandPassGain()
// missile.connect( mainGain )
// let explosion = whiteNoiseBandPassGain()
// explosion.connect( compressor.gain1 )
// compressor.connect( mainGain )
// function stop(){
// mainGain.gain.linearRampToValueAtTime(0.0, ctx.currentTime + 0.1 )
// }
// function start(){
// const nominalGain = 0.8
// mainGain.gain.linearRampToValueAtTime(nominalGain, ctx.currentTime + 0.1 )
// }
// // console.log( compressor )
// //engine.osc.stop()
// //engine2.osc.stop()
// //missile.noise.stop()
// return {
// stop,
// start,
// //
// setef : f => engine.osc.frequency.setTargetAtTime( f, ctx.currentTime, 0.25),
// seteg : g => engine.gain.gain.setTargetAtTime( g / 8, ctx.currentTime, 0.25),
// setmf : f => engine2.osc.frequency.setTargetAtTime( f, ctx.currentTime, 0.5),
// setmg : g => engine2.gain.gain.setTargetAtTime( g / 8, ctx.currentTime, 0.5),
// //
// setMissileF : (f,l=0.05) => {
// missile.bandpass.frequency.setTargetAtTime( f, ctx.currentTime, l )
// },
// setMissileQ : q => missile.bandpass.Q.setTargetAtTime( q, ctx.currentTime, 0.15),
// setMissileG : g => missile.gain.gain.setTargetAtTime( g / 8, ctx.currentTime, 0.01),
// //
// setExplosionF : (f,l=0.25,dt=0) => explosion.bandpass.frequency.setTargetAtTime( f, ctx.currentTime+dt, l),
// setExplosionG : (g,l=0.25,dt=0) => explosion.gain.gain.setTargetAtTime( g, ctx.currentTime+dt, l),
// setExplosionQ : (q,l=0.25,dt=0) => explosion.bandpass.Q.setTargetAtTime( q, ctx.currentTime+dt, l),
// }
// // gainNode.gain.linearRampToValueAtTime( 0.0, ctx.currentTime + 10)
// // param.setTargetAtTime(target, startTime, timeConstant);
// }
// export function Audio(){
// let ON = {
// state : false
// }
// let lastNDebris = 0
// let synth
// Promise
// .all( [ fetchWaveTables(), waitAudioContext() ] )
// .then( ([ wavetables, ctx ]) => {
// synth = new Synth( ctx, wavetables )
// if ( ON.state ){
// //synth.start()
// }
// window.addEventListener('mousemove',e => {
// // bottom left origin
// let x = e.clientX / window.innerWidth
// let y = ( 1 - e.clientY / window.innerHeight )
// let f = x * 1000
// let v = y * 0.5
// let q = y * 10
// //synth.setnf( f )
// //synth.setExplosionF( f )
// //synth.setExplosionQ( q )
// // synth.setExplosionG( 0.5 )
// //console.log(f)
// })
// })
// const regimes = [
// { f : 20, g : 0.1 },
// { f : 30, g : 0.2 },
// { f : 34, g : 0.22 },
// { f : 38, g : 0.23 },
// { f : 45, g : 0.25 },
// ]
// const regimesb = [
// { f : 10, g : 0.3 },
// { f : 13, g : 0.15 },
// { f : 15, g : 0.2 },
// { f : 18, g : 0.15 },
// { f : 23, g : 0.08 },
// ]
// const regimeMissile = { f : 600, g : 1.0, q : 20 }
// function start(){
// ON.state = true
// if ( synth ){
// synth.start()
// }
// }
// function stop(){
// ON.state = false
// if ( synth ){
// synth.stop() // }
// }
// let lastTreatedEventNum = -1
// function treatEvent( e, f ){
// if ( !e ) return
// if ( e.num > lastTreatedEventNum ){ // f()
// lastTreatedEventNum = e.num
// }
// }
// function mix( State ){
// ;[ State.bombs,
// State.missiles,
// State.explosions ].forEach( l => {
// l.forEach( x => {
// if ( x.justFired ){
// const e = x.justFired
// treatEvent( e, () => 0/*sole.log('--', e ) */)
// }
// })
// })
// if ( !synth ){
// return // }
// if ( synth ){
// const me = State.me
// if ( me ){
// const sound_target = State[ me.type ][ me.idx ]
// if ( sound_target ){
// // TODO : ttl
// const { p } = sound_target
// {
// const regime = regimes[ p ]
// const f = regime.f + ( Math.random() * 5 )
// const g = Math.min( 1, regime.g + Math.random() * 0.1 )
// synth.setef( f )
// synth.seteg( g )
// }
// {
// const regime = regimesb[ p ]
// const f = regime.f //+ ( Math.random() * 5 )
// const g = Math.min( 1, regime.g + Math.random() * 0.1 )
// synth.setmf( f )
// synth.setmg( g )
// }
// }
// }
// {
// if ( State.missiles ){
// let nmissiles = 0
// let fired = 0
// State.missiles.forEach( m => {
// if ( m.ttl > 0 ){
// if ( m.ttl === 99 ){
// fired = true
// }
// nmissiles++
// }
// })
// if ( nmissiles > 5 ){
// nmissiles = 5
// } // let g = Math.sqrt( nmissiles / 5 ) * regimeMissile.g
// synth.setMissileG( g )
// if ( fired ){
// synth.setMissileF( 5000, 0.001 )
// } else if ( nmissiles ) {
// let f = regimeMissile.f * 2 + Math.random() * 300 // let q = regimeMissile.q - Math.random() * 10
// synth.setMissileF( f )
// synth.setMissileQ( q )
// }
// }
// if ( State.debris ){
// let ndebris = 0
// State.debris.forEach( debri => {
// ndebris++
// })
// if ( lastNDebris < ndebris ){
// synth.setExplosionF( 0.01, 0.01 )
// synth.setExplosionG( 1.0, 0.001 )
// synth.setExplosionQ( 0.00001, 0.01 )
// synth.setExplosionF( 100, 0.2,0.1 )
// synth.setExplosionG( 0, 0.2,0.1 )
// synth.setExplosionQ( 10, 0.1,0.1 )
// /* boum sourd sec // synth.setExplosionF( 0.01, 0.1 )
// synth.setExplosionG( 0.5, 0.1 )
// synth.setExplosionQ( 0.0001, 0.0001 )
// synth.setExplosionF( 10, 0.2,0.1 )
// synth.setExplosionG( 0, 0.01,0.1 )
// synth.setExplosionQ( 100, 0.01,0.1 )
// */
// /* bouchon // synth.setExplosionF( 500, 0.1 )
// synth.setExplosionG( 0.5, 0.1 )
// synth.setExplosionQ( 0.001, 0.01 )
// synth.setExplosionF( 10, 0.2,0.1 )
// synth.setExplosionG( 0, 0.01,0.1 )
// synth.setExplosionQ( 100, 0.01,0.1 )
// */
// /*
// synth.setExplosionF( 100, 0.01 )
// synth.setExplosionG( 0, 0.01 )
// synth.setExplosionQ( 0.01, 0.01 )
// synth.setExplosionF( 0, 0.2,0.1 )
// synth.setExplosionG( 0.3, 0.01,0.1 )
// synth.setExplosionQ( 30, 0.01,0.1 )
// */
// } // lastNDebris = ndebris
// }
// }
// }
// }
// return {
// setState : mix,
// start,
// stop
// }
// }
