export function rectangle_intersection(x1,y1,w1,h1,x2,y2,w2,h2, o = {} ){
    o.l = Math.max( x1, x2 )
    o.r = Math.min( x1 + w1 , x2 + w2 )
    if ( o.l >= o.r )
        return 
    o.b = Math.max( y1, y2 )
    o.t = Math.min( y1 + h1 , y2 + h2)
    if ( o.b >= o.t )
        return
    return o
}
export function rectangle_intersection_bool(x1,y1,w1,h1,x2,y2,w2,h2 ){
    const l = Math.max( x1, x2 )
    const r = Math.min( x1 + w1 , x2 + w2 )
    if ( l >= r )
        return false
    const b = Math.max( y1, y2 )
    const t = Math.min( y1 + h1 , y2 + h2)
    if ( b >= t )
        return false
    return true
}
export function rectangle_includes(x1,y1,w1,h1, x2,y2,w2,h2){

    // 1 includes 2
    return ( x1 <= x2 ) && ( x2 <= ( x1 + w1 ) ) 
        && ( x1 <= ( x2 + w2 ) )  &&  ( ( x2 + w2 ) <= ( x1 + w1 ) )
        && ( y1 <= y2 ) && ( y2 < ( y1 + h1 ) ) 
        && ( y1 <= ( y2 + h2 ) )  &&  ( ( y2 + h2 ) <= ( y1 + h1 ) )
        
    
}
