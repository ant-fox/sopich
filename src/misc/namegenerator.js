export function NameGenerator(){
    let letters = [
        /* rare wov */ 'jy'.split(''),
        /* freq wov */ 'aeiou'.split(''),
        /* rare_con */ 'hkqvxz'.split(''),
        /* freq_con */ 'bcdfglmnprst'.split('')
    ]
    let freqs = [
        // rw fw rc fc
        [ 0,1,1,10 ], // rw
        [ 1,1,2,12 ], // fw
        [ 1,20,0,0 ], // rc
        [ 2,20,1,1 ]  // fc
    ]
    let arrays = freqs.map( (freqs,fidx) => {
        let total = freqs.reduce( (r,x) => r+x, 0 )
        let normalized = freqs.map( x => x/total)
        let minArraySize = 20
        let sized = normalized.map( x => {
            return ( x === 0 )?0:Math.ceil( x * minArraySize )
        })
        let array = sized.reduce( ( r, x, idx ) => {
            return [...r, ...new Array( x ).fill( idx ) ]
        },[])
        return array
    })
    return function buildName(){    
        let length = 4 + Math.floor( Math.pow( Math.random(), 5 ) * 10 )
        let last = Math.floor( Math.random() * letters.length )
        let namea = []
        for ( let i = 0 ; i < length ; i++ ){
            let array = arrays[ last ]
            let rndIdx = Math.floor( Math.random() * array.length )
            let categ = array[ rndIdx ]
            let choices = letters[ categ ]
            let letter = choices[ Math.floor( Math.random() * choices.length ) ]
            namea[ i ] = letter     
            last = categ
        }
        return namea.join('')
    }
}
