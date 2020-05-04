/*
 * client connexions watchdog (server side)
 */
function terminateBrokenSockets( wss, period = 30000 ){
    
    function noop() {}
    
    function heartbeat() {
        this.isAlive = true;
    }
    wss.on('connection', function connection(ws) {
        ws.isAlive = true;
        ws.on('pong', heartbeat);
    });
    
    const interval = setInterval(function ping() {
        wss.clients.forEach(function each(ws) {
            if (ws.isAlive === false) {
                return ws.terminate()
            }
            ws.isAlive = false
            ws.ping(noop)
        });
    }, period )
    
    wss.on('close', function close() {
        clearInterval(interval);
    });
}

module.exports = terminateBrokenSockets
