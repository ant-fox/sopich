const WebSocket = require('ws')
const url = require('url')

function WebSocketServersPool( httpServer, sessionParser ){
    if ( httpServer === undefined ){
        throw new Error('must pass an http server')
    }
    /*
     * Pool of websocket servers using passport sessionParser for auth, 
     * where upgrade is routed to different websocket servers 
     * using /socket-name url scheme
     */
    const servers = new Map()
    
    function create( name ){
        const wss = new WebSocket.Server( {
            noServer: true,
        } )       
        servers.set( name, wss )
        return wss
    }
    function remove( name ){
        const wss = servers.get( name )
        if ( wss ){
            wss.close()
            servers.delete( name )
        }
    }
    httpServer.on('upgrade', function upgrade(request, socket, head) {

        function deny401(){
            socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n')
            socket.destroy()
        }
        function deny404(){
            socket.write('HTTP/1.1 404 Not Found\r\n\r\n')
            socket.destroy()
        }

        function usernameFromRequest( request ){
            try {
                const username = request.session.passport.user.username
                return username
            } catch ( e ){
                return undefined
            }
        }

        const socketServerName = url.parse( request.url ).pathname.slice( 1 )
        const wss = servers.get( socketServerName )
        
        if ( wss === undefined ){
            deny404()
            return
        }
        
        sessionParser( request, {}, () => {

            const username =  usernameFromRequest( request )

            if ( username === undefined ){
                deny401()
                return
            }

            wss.handleUpgrade( request, socket, head, function done( ws ) {
                wss.emit( 'connection', ws, request, username )
            })
        })
        
    })
    return { create, remove }
}
module.exports = WebSocketServersPool
