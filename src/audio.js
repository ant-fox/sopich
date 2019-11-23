//
function waitAudioContext(){

    const AudioContext = window.AudioContext || window.webkitAudioContext;
    
    return new Promise( resolve => {        
        
        const ctx = new AudioContext();
        ctx.onstatechange = running
        function running(){
            if ( ctx.state === 'running' ){
                ctx.onstatechange = undefined
                console.log('context ok')
                resolve( ctx )
            }
        }
        function check(){
            if ( ctx.state !== 'running' ){
                ctx.resume()
                setTimeout( check, 500 )
            }
        }
        check()
    })
}
/*
const ALL = [ 'Bass_Amp360','01_Saw','02_Triangle','03_Square','04_Noise','05_Pulse','06_Warm_Saw','07_Warm_Triangle','08_Warm_Square','09_Dropped_Saw','10_Dropped_Square','11_TB303_Square','Bass','Bass_Fuzz','Bass_Fuzz_ 2','Bass_Sub_Dub','Bass_Sub_Dub_2','Brass','Brit_Blues','Brit_Blues_Driven','Buzzy_1','Buzzy_2','Celeste','Chorus_Strings','Dissonant Piano','Dissonant_1','Dissonant_2','Dyna_EP_Bright','Dyna_EP_Med','Ethnic_33','Full_1','Full_2','Guitar_Fuzz','Harsh','Mkl_Hard','Organ_2','Organ_3','Phoneme_ah','Phoneme_bah','Phoneme_ee','Phoneme_o','Phoneme_ooh','Phoneme_pop_ahhhs','Piano','Putney_Wavering','Throaty','Trombone','Twelve String Guitar 1','Twelve_OpTines','Wurlitzer','Wurlitzer_2','original','original/01_Saw','original/02_Triangle','original/03_Square','original/04_Noise','original/05_Pulse','original/06_Warm_Saw','original/07_Warm_Triangle','original/08_Warm_Square','original/09_Dropped_Saw','original/10_Dropped_Square','original/11_TB303_Square','original/Bass','original/Bass_Amp360','original/Bass_Fuzz','original/Bass_Fuzz_ 2','original/Bass_Sub_Dub','original/Bass_Sub_Dub_2','original/Brass','original/Brit_Blues','original/Brit_Blues_Driven','original/Buzzy_1','original/Buzzy_2','original/Celeste','original/Chorus_Strings','original/Dissonant Piano','original/Dissonant_1','original/Dissonant_2','original/Dyna_EP_Bright','original/Dyna_EP_Med','original/Ethnic_33','original/Full_1','original/Full_2','original/Guitar_Fuzz','original/Harsh','original/Mkl_Hard','original/Organ_2','original/Organ_3','original/Phoneme_ah','original/Phoneme_bah','original/Phoneme_ee','original/Phoneme_o','original/Phoneme_ooh','original/Phoneme_pop_ahhhs','original/Piano','original/Putney_Wavering','original/Throaty','original/Trombone','original/Twelve String Guitar 1','original/Twelve_OpTines','original/Wurlitzer','original/Wurlitzer_2','original/yyy','original/zzz']
*/
const GOOD = ["Bass_Amp360", "Harsh", "Mkl_Hard", "Organ_2", "Organ_3", "Phoneme_ah", "Phoneme_bah", "01_Saw", "02_Triangle", "03_Square", "04_Noise", "05_Pulse", "06_Warm_Saw", "07_Warm_Triangle", "08_Warm_Square", "09_Dropped_Saw", "10_Dropped_Square", "11_TB303_Square", "Bass", "Bass_Fuzz", "Bass_Fuzz_ 2", "Bass_Sub_Dub", "Bass_Sub_Dub_2", "Brass", "Brit_Blues", "Brit_Blues_Driven", "Buzzy_1", "Buzzy_2", "Celeste", "Chorus_Strings", "Dissonant Piano", "Dissonant_1", "Dissonant_2", "Dyna_EP_Bright", "Dyna_EP_Med", "Ethnic_33", "Full_1", "Full_2", "Guitar_Fuzz", "Phoneme_ee", "Phoneme_o", "Phoneme_ooh", "Phoneme_pop_ahhhs", "Piano", "Putney_Wavering", "Throaty", "Trombone", "Twelve String Guitar 1", "Twelve_OpTines", "Wurlitzer", "Wurlitzer_2", "original/yyy", "original/zzz"]

function nameToUrl( name ){
    const url = [/*'.',*/'','wave-tables',name].join('/')
    console.log('url',url)
    return url
}
// let bad = []  // 52
// let good = [] // 53
// console.log('NNN',NAMES) // 105
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

function Synth( ctx, wavetables ){
    
    function compressorGain(){
        // Create a compressor node

        const gain1 = ctx.createGain();
        gain1.gain.setValueAtTime( 20.0, ctx.currentTime )
        
        var compressor = ctx.createDynamicsCompressor();
        compressor.threshold.setValueAtTime(-80, ctx.currentTime); // [ - 100,  0 ] -24
        compressor.knee.setValueAtTime(40, ctx.currentTime);  // [ 0, 40 ] 30
        compressor.ratio.setValueAtTime(12, ctx.currentTime); // [ 1, 20 ] 12
        compressor.attack.setValueAtTime(0, ctx.currentTime);
        
        compressor.release.setValueAtTime(0.25, ctx.currentTime);
//        compressor.reduction/*.setValueAtTime(0, ctx.currentTime) // [ 0, -20 ]

        const gain2 = ctx.createGain();
        gain2.gain.setValueAtTime( 0.8, ctx.currentTime )
      
        // connect the AudioBufferSourceNode to the destination
        gain1.connect(compressor).connect(gain2)
        //return { compressor, gain1, gain2 }
        return {
            gain1,
            compressor,
            connect : m => gain2.connect( m )
        }
    }
    let compressor = compressorGain()
    /*let compressor = {
        compressor : ctx.destination
    }*/
    function whiteNoiseBandPassGain(){
        let noiseDuration = 1;
        
        const bufferSize = ctx.sampleRate * noiseDuration
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
        let data = buffer.getChannelData(0)
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        
        let noise = ctx.createBufferSource();
        noise.buffer = buffer;
        noise.loop = true
        let bandHz = 200                
        let bandpass = ctx.createBiquadFilter()
        bandpass.type = 'bandpass'
        bandpass.Q.value = 50 // 760
        bandpass.frequency.value = bandHz
        
        const gain = ctx.createGain();
        gain.gain.setValueAtTime( 0.5, ctx.currentTime )
        
        noise.connect( bandpass ).connect( gain )

        noise.start();
        return {
            noise,
            bandpass,
            gain,
            connect : m =>  gain.connect( m )
        }
    }
    
    
    function periodicWaveOscillatorGain( name ){
        const wavetable = wavetables[ name ]
        const wave = ctx.createPeriodicWave(new Float32Array(wavetable.real), new Float32Array(wavetable.imag));
        const osc = ctx.createOscillator();
        osc.frequency.setValueAtTime( 0.0, ctx.currentTime )
        osc.setPeriodicWave(wave);
        osc.start();
        const gain = ctx.createGain();
        gain.gain.setValueAtTime( 0.0, ctx.currentTime )
        osc.connect( gain )
        return {
            osc,
            gain,
            connect : m => gain.connect( m )
        }
    }

        
    let engine = periodicWaveOscillatorGain('Wurlitzer')
    engine
        .connect( ctx.destination )

    let engine2 = periodicWaveOscillatorGain('Brit_Blues')
    engine2
        .connect( ctx.destination )
    
    let missile = whiteNoiseBandPassGain()
    missile
        .connect( ctx.destination )

    let explosion = whiteNoiseBandPassGain()
    explosion
        .connect( compressor.gain1 )
    
    compressor.connect( ctx.destination )
    
    console.log( compressor )
    //engine.osc.stop()
    //engine2.osc.stop()

    //missile.noise.stop()
  
    return {
        //
        setef : f => engine.osc.frequency.setTargetAtTime( f, ctx.currentTime, 0.25),
        seteg : g => engine.gain.gain.setTargetAtTime( g / 8, ctx.currentTime, 0.25),
        setmf : f => engine2.osc.frequency.setTargetAtTime( f, ctx.currentTime, 0.5),
        setmg : g => engine2.gain.gain.setTargetAtTime( g / 8, ctx.currentTime, 0.5),
        //
        setMissileF : (f,l=0.05) => {
            missile.bandpass.frequency.setTargetAtTime( f, ctx.currentTime, l )
        },
        setMissileQ : q => missile.bandpass.Q.setTargetAtTime( q, ctx.currentTime, 0.15),
        setMissileG : g => missile.gain.gain.setTargetAtTime( g / 8, ctx.currentTime, 0.01),
        //
        setExplosionF : (f,l=0.25,dt=0) => explosion.bandpass.frequency.setTargetAtTime( f, ctx.currentTime+dt, l),
        setExplosionG : (g,l=0.25,dt=0) => explosion.gain.gain.setTargetAtTime( g, ctx.currentTime+dt, l),
        setExplosionQ : (q,l=0.25,dt=0) => explosion.bandpass.Q.setTargetAtTime( q, ctx.currentTime+dt, l),
    }
    // gainNode.gain.linearRampToValueAtTime( 0.0, ctx.currentTime + 10)
    // param.setTargetAtTime(target, startTime, timeConstant);
    
}


export function Audio(){

    let lastNDebris = 0
    
    let synth
    Promise
        .all( [ fetchWaveTables(),  waitAudioContext() ] )
        .then( ([ wavetables, ctx ]) => {

            synth = new Synth( ctx, wavetables )
            
            window.addEventListener('mousemove',e => {
                // bottom left origin
                let x = e.clientX / window.innerWidth
                let y = ( 1 - e.clientY / window.innerHeight )
                let f = x * 1000
                let v = y * 0.5
                let q = y * 10
                //synth.setnf( f )
                //synth.setExplosionF( f )
                //synth.setExplosionQ( q )
                //                synth.setExplosionG( 0.5 )
                //console.log(f)
            })
        })

    const regimes = [
        { f : 20, g : 0.1 },
        { f : 30, g : 0.2 },
        { f : 34, g : 0.22 },
        { f : 38, g : 0.23 },
        { f : 45, g : 0.25 },
    ]
    const regimesb = [
        { f : 10, g : 0.3 },
        { f : 13, g : 0.15 },
        { f : 15, g : 0.2 },
        { f : 18, g : 0.15 },
        { f : 23, g : 0.08 },
    ]

    const regimeMissile = { f : 600, g : 1.0, q : 20 }
    
    function mix( State ){
        if ( synth ){
            const me = State.me
            const sound_target = State[ me.type ][ me.idx ]
            if ( sound_target ){
                // TODO : ttl
                const { p } = sound_target
                {
                    const regime = regimes[ p ]
                    const f = regime.f + (  Math.random() * 5 )
                    const g = Math.min( 1, regime.g + Math.random() * 0.1 )
                    synth.setef( f )
                    synth.seteg( g )
                }
                {
                    const regime = regimesb[ p ]
                    const f = regime.f  //+ (  Math.random() * 5 )
                    const g = Math.min( 1, regime.g + Math.random() * 0.1 )
                    synth.setmf( f )
                    synth.setmg( g )
                }
            }
            {
                let nmissiles = 0
                let fired = 0
                State.missiles.forEach( m => {
                    if ( m.ttl > 0 ){
                        if ( m.ttl === 99 ){
                            fired = true
                        }
                        nmissiles++
                    }
                })
                if ( nmissiles > 5 ){
                    nmissiles = 5
                }                
                let g = Math.sqrt( nmissiles / 5 ) * regimeMissile.g
                synth.setMissileG( g  )
                if ( fired ){
                    synth.setMissileF( 5000, 0.001 )
                } else if ( nmissiles ) {
                    let f = regimeMissile.f * 2 + Math.random() * 300 
                    let q = regimeMissile.q - Math.random() * 10
                    synth.setMissileF( f )
                    synth.setMissileQ( q )
                }
                let ndebris = 0
                State.debris.forEach( debri => {
                    ndebris++
                })
                if ( lastNDebris < ndebris ){
                    
                    synth.setExplosionF( 0.01, 0.01 )
                    synth.setExplosionG( 1.0, 0.001 )
                    synth.setExplosionQ( 0.00001, 0.01 )
                    
                    synth.setExplosionF( 100, 0.2,0.1 )
                    synth.setExplosionG( 0,  0.2,0.1 )
                    synth.setExplosionQ( 10, 0.1,0.1 )
                    
                    /* boum sourd sec 
                    synth.setExplosionF( 0.01, 0.1 )
                    synth.setExplosionG( 0.5, 0.1 )
                    synth.setExplosionQ( 0.0001, 0.0001 )
                    
                    synth.setExplosionF( 10, 0.2,0.1 )
                    synth.setExplosionG( 0, 0.01,0.1 )
                    synth.setExplosionQ( 100, 0.01,0.1 )
                    */
                    /* bouchon 
                    synth.setExplosionF( 500, 0.1 )
                    synth.setExplosionG( 0.5, 0.1 )
                    synth.setExplosionQ( 0.001, 0.01 )
                    
                    synth.setExplosionF( 10, 0.2,0.1 )
                    synth.setExplosionG( 0, 0.01,0.1 )
                    synth.setExplosionQ( 100, 0.01,0.1 )
                    */
                    /*
                      synth.setExplosionF( 100, 0.01 )
                      synth.setExplosionG( 0, 0.01 )
                      synth.setExplosionQ( 0.01, 0.01 )
                      
                      synth.setExplosionF( 0, 0.2,0.1 )
                      synth.setExplosionG( 0.3, 0.01,0.1 )
                      synth.setExplosionQ( 30, 0.01,0.1 )
                    */
                } 
                lastNDebris = ndebris
                
            }
        }
            
    }
    return {
        setState : mix
    }
}
