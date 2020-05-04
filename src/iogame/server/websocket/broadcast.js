function broadcast( wss, msg ){
    wss.clients.forEach( function( client ) {
        if (client.readyState === WebSocket.OPEN) {
            client.send( msg )
        }
    })
}
module.exports = broadcast
