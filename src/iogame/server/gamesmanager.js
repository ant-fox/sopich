/*
 * A Map<name,game>
 * with a maximum size
 * and where a value cannot be reset
 */
function GamesManager( _options ){

    const options = Object.assign({
        maxGamesCount : 4,
    },_options)

    const games = new Map()

    function add( name, game ){
        if ( games.has( name ) ){
            throw new Error('already a game with this name')
        }
        if ( games.size > options.maxGamesCount ){
            throw new Error('too many games')
        }
        games.set( name, game )
    }
    function remove( name ){
        if ( !games.has( name ) ){
            throw new Error('no game with this name')
        }
        games.delete( name )
    }
    function get( name ){
        if ( !games.has( name ) ){
            throw new Error('no game with this name')
        }
        return games.get( name )
    }
    function isFull(){
        return games.maxGamesCount === games.size
    }
    function forEach( f ){
        games.forEach( f )
    }
    
    return { isFull, add, remove, get, forEach }
}
/*
gamesManager.add( 'game1', 'DATA1' )
gamesManager.add( 'game2', 'DATA2' )
gamesManager.add( 'game3', 'DATA3' )
gamesManager.add( 'game4', 'DATA4' )
console.log(gamesManager)
gamesManager.forEach( (name,game ) => console.log('-',name,game ) )
*/

module.exports = GamesManager

