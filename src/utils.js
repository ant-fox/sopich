export function clamp( x, a, b ){
    return Math.max(a,Math.min(x,b))
}
export function posmod(n,m) {
    return ((n%m)+m)%m;
};
