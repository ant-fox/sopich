export function clamp( x, a, b ){
    return Math.max(a,Math.min(x,b))
}
export function posmod(n,m) {
    return ((n%m)+m)%m;
};

/**
 * Converts an HSL color value to RGB. Conversion formula
 * adapted from http://en.wikipedia.org/wiki/HSL_color_space.
 * Assumes h, s, and l are contained in the set [0, 1] and
 * returns r, g, and b in the set [0, 255].
 *
 * @param   Number  h       The hue
 * @param   Number  s       The saturation
 * @param   Number  l       The lightness
 * @return  Array           The RGB representation
 */
export function hslToRgb(h, s, l) {
  var r, g, b;

  if (s == 0) {
    r = g = b = l; // achromatic
  } else {
    function hue2rgb(p, q, t) {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    }

    var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    var p = 2 * l - q;

    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }

  return [ r * 255, g * 255, b * 255 ];
}

export const chainf = fs => x => fs.reduce( (x,f) => f(x), x )
// let k = chainf( [ x => x/2, x=> x+1 ] )
// console.log('----', k(8) )
export const fsetk = ( o, k, v ) => { o[ k ] = v ; return o }
// .reduce( ( r, x ) => fsetk( r, KEYF( x ), x ), {} )
export const defined = x => ( x !== undefined )

export function centerText( text, l, c = ' ', biasLeft = true ){
    
    let biasf = biasLeft?Math.floor:Math.ceil
    let bef = Math.max( 0, biasf( ( l - text.length ) / 2 ) )
    let aft =  Math.max(0, l - text.length - bef)
    return [
        ' '.repeat( bef ),
        text,
        ' '.repeat( aft ),
    ].join('').substring(0,l)
}

export function dist( a, b ){
    return Math.sqrt( Math.pow( a.x - b.x, 2) + Math.pow( a.y - b.y, 2) )
}
export function sqdist( a, b ){
    return Math.pow( a.x - b.x, 2) + Math.pow( a.y - b.y, 2)
}
export function manhattan( a, b ){
    return Math.abs( a.x - b.x ) + Math.abs( a.y - b.y )
}
