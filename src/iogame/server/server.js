const express = require('express')
const webpack = require('webpack')
const webpackDevMiddleware = require('webpack-dev-middleware')
//const socketio = require('socket.io')
const mongoose = require('mongoose')
const LocalStrategy = require('passport-local')
const Constants = require('../shared/constants')
const { User, loginOrCreate } = require('./user.js')
const flash = require('express-flash');
const { loginPage } = require('./loginpage.js')
/*
 * debug
 */
function debugMessage( ...p ){
    console.log('[sopich server]',...p)
}

/*
 * db connection
 */
const localcs = 'mongodb://127.0.0.1:27017/TodoApp'
mongoose.connect(process.env.MONGOLAB_URI || localcs, {useNewUrlParser: true} )
debugMessage('using db',process.env.MONGOLAB_URI || localcs )

/*
 * Express
 */
const app = express()

/*
 * Cookie Parser
 */
const cookieParser = require('cookie-parser')
app.use( cookieParser() )

/*
 * Body Parser 
 */
const bodyParser = require('body-parser')
app.use( bodyParser.urlencoded({ extended: true } ) )

/*
 * Session
 */
const ExpressSession = require('express-session')
const MongoStore = require('connect-mongo')(ExpressSession)
const SESSION_SECRET = 'securedbynumberandspecialsign$5'
const sessionStore = new MongoStore({ mongooseConnection: mongoose.connection })
const expressSession = ExpressSession({
    secret: SESSION_SECRET,
    resave: true,
    saveUninitialized: true,
    store : sessionStore
})
app.use( expressSession )
app.use(flash())

/*
 * Passport
 */
const passport = require('passport')

passport.serializeUser( (user, done) => done(null, user) )
passport.deserializeUser( (user, done) => done(null, user) )
passport.use( new LocalStrategy( loginOrCreate ) )

app.use( passport.initialize() )
app.use( passport.session() )

function checkIfUserIsLoggedIn(req, res, next) {
    if (req.user && req.user.username) {
        next()
    } else {
        res.redirect('/login')
    }
}

/*
 * Connection endpoints
 */
app.post('/login',
         passport.authenticate('local', {
             successRedirect: '/',
             failureRedirect: '/login',
             failureFlash : true
         }))
app.get('/logout',
        (req, res) => {
            debugMessage('logs out')
            req.logout()
            res.redirect('/')
        })
app.post('/delete',  [
    checkIfUserIsLoggedIn,
    ( req, res) => {
        const username = req.user.username
        req.logout()
        debugMessage('delete account',username)
        User.deleteOne({ username }).then( x => debugMessage('deleted',username) )
        res.redirect('/')
        
    }])
app.get('/login',
        (req, res) => {
            const user = req.user            
            const errors = req.flash('error')
            const html = loginPage( user, errors )
            res.send( html )
        })


/*
 * Serve static / dev pages
 */
if (process.env.NODE_ENV === 'development') {
    // Setup Webpack for development
    const webpackConfig = require('../../../webpack.dev.js')
    const compiler = webpack(webpackConfig)
    app.use([checkIfUserIsLoggedIn,webpackDevMiddleware(compiler)])
} else {
    // Static serve the dist/ folder in production
    app.use('/',[checkIfUserIsLoggedIn,express.static('dist')])
}

// TODO remove
app.get('/stats/users', function(req, res) {
    User.find({}, function(err, users) {
        res.send(users.map( ({username,score,passwordHash,keyboardMapping}) => ({
            username,score,passwordHash,keyboardMapping
        })))
    })
})

/*
 * Start http server
 */
const port = process.env.PORT || 3000
const server = app.listen(port)
debugMessage(`Server listening on port ${port}`)

/*
 * socket servers
 */
const WebSocketServersPool = require('./websocket/websocketserverspool.js')
const terminateBrokenSockets = require('./websocket/terminatebrokensockets.js') 
const webSocketServersPool = WebSocketServersPool( server, expressSession )

/*
 * socket games
 */
const GamesManager = require('./gamesmanager.js')
const gamesManager = GamesManager()

function gameDebugMessage( ...p ){
    console.log('[sopich server/game]',...p)
}
function createSopichWebSocketGame( name ){

    
    // cp to client
    function deserializeMessage( data ){
        try {
            const [ type, body ] = JSON.parse( data )
            return [ type, body ]
        } catch ( e ){
            return  undefined
        }
    }
    function serializeMessage( type, body ){
        try {
            const data = JSON.stringify( [ type, body ] )
            return data
        } catch ( e ){
            return  undefined
        }            
    }
    function send( ws, type, body ){
        const data = serializeMessage( type, body )
        if ( data ){
            ws.send( data )
        }
    }

    if ( gamesManager.isFull() ){
        return undefined
    }
    
    const socketByUsername = new Map()
    
    const socketServer1 = webSocketServersPool.create( name )   
    terminateBrokenSockets( socketServer1 )

    const { Game } = require( '../../game.js' )
    
    const game = new Game( {
        tellPlayer : ( username, update ) => {
            const ws = socketByUsername.get( username )
            if ( ws ){
                send( ws, Constants.MSG_TYPES.GAME_UPDATE, update )
            } 
        },
        tellScore : async ( username, score ) => {
            gameDebugMessage( username,'quits with score',JSON.stringify(score) )
            await User.updateScore( username, score )
        }
    } )    
    gamesManager.add( name, game )
  
    
    socketServer1.on('connection', async ( ws, session, username ) => {
        if ( username === undefined ){
            ws.terminate()
        }
        debugMessage('successful connection to socket', username )
        
        socketByUsername.set( username, ws )

        // send user infos
        const user = await User.findOne( { username } )
        if ( user ){
            const yourInfo = {
                username,
                score : user.score,
                keyboardMapping : user.keyboardMapping
            }
            send( ws, Constants.MSG_TYPES.YOUR_INFO, yourInfo )
        }
        
        
        function onUserSendsJoin(){
            const error = game.addPlayer( username, username,  user.score )
            if ( error === 0 ){
                gameDebugMessage(username, 'joined game' )
                send( ws, Constants.MSG_TYPES.JOINED_GAME_OK )
            } else {
                gameDebugMessage(username, 'could not join' )
                send( ws, Constants.MSG_TYPES.JOINED_GAME_KO, error )
            }
        }        
        function onUserSendsInput( input ){
            game.handleInput( username, input )
        }
        async function onUserSendsKeyboardMapping( keyboardMapping ){
            gameDebugMessage( username, 'maps keys', keyboardMapping )
            const rez = await User.updateKeyboardMapping( username, keyboardMapping )
        }

        function dispatchMessage( type, body ){

            let f = undefined

            switch ( type ){
            case Constants.MSG_TYPES.KEYBOARD_MAPPING :
                f = onUserSendsKeyboardMapping
                break
            case Constants.MSG_TYPES.JOIN_GAME :
                f = onUserSendsJoin
                break
            case  Constants.MSG_TYPES.INPUT  :
                f = onUserSendsInput
                break
            }
            
            if ( f ) f( body )
        }
        ws.on('message', function( data ){
            const msg = deserializeMessage( data )
            if ( msg !== undefined ){
                const [ type, body ] = msg
                dispatchMessage( type, body )
            }
        })
        ws.on('close', function(...params){
            gameDebugMessage( username,'is disconnected' )
            game.removePlayer( username )
            socketByUsername.delete( username )
        })
    })
}
createSopichWebSocketGame('monsocketserver1')


// function NON(){
    
//     /*  
//      * passport socket io 
//      */
//     const passportSocketIo = require("passport.socketio");
//     function onAuthorizeSuccess(data, accept){
//         const user = data.user
//         debugMessage('successful connection to socket.io', JSON.stringify( user ) )
//         accept(null, true);
//     }

//     function onAuthorizeFail(data, message, error, accept){
//         if (error) throw new Error(message);
//         debugMessage('failed connection to socket.io:', message);
//         accept(null, false);
//     }

//     /*
//      * socket.io 
//      */
//     const io = socketio(server)
//     io.use(passportSocketIo.authorize({
//         cookieParser: cookieParser,       // the same middleware you registrer in express
//         key:          'connect.sid',       // the name of the cookie where express/connect stores its session_id
//         secret:       SESSION_SECRET,    // the session_secret to parse the cookie
//         store:        sessionStore,        // we NEED to use a sessionstore. no memorystore please
//         success:      onAuthorizeSuccess,  // *optional* callback on success - read more below
//         fail:         onAuthorizeFail,     // *optional* callback on fail/error - read more below
//     }));


//     /*
//      * Listen for socket.io connections
//      */
//     io.on('connection', socket => {

//         debugMessage('socket connexion, id ', socket.id)
//        const user = socket.request.user
//         if ( user && user.logged_in ){
//             const { username, score } = user
//             User.findOne( { username } )
//                 .then( ({keyboardMapping}) => {
//                     const yourInfo = { username, score, keyboardMapping  }
//                     debugMessage('io connected', JSON.stringify( yourInfo) )
//                     setTimeout( () => {
//                         socket.emit(Constants.MSG_TYPES.YOUR_INFO, yourInfo )
//                     },1000)
//                 })
//             socket.on(Constants.MSG_TYPES.JOIN_GAME, joinGame)
//             socket.on(Constants.MSG_TYPES.KEYBOARD_MAPPING, handleKeyboardMapping)
//             socket.on(Constants.MSG_TYPES.INPUT, handleInput)
//             socket.on('disconnect', onDisconnect)
//         }
        

//     })

//     /*
//      * Setup the Game
//      */
//     function gameDebugMessage( ...p ){
//         console.log('[sopich server/game]',...p)
//     }
//     const { Game } = require( '../../game.js' )

//     function tellPlayer( socketId, update ){
//         io.to(`${socketId}`).emit( Constants.MSG_TYPES.GAME_UPDATE, update )
//     }
//     async function tellScore( username, score ){
//         gameDebugMessage( username,'quits with score',JSON.stringify(score) )
//         await User.updateScore( username, score )
//     }
//     const game = new Game( { tellPlayer, tellScore } )
//     // TOOO : remove ?
//     app.get('/stats/players', function(req, res, next) {
//         if ( game && game.players ){
//             let names = game.players.names()
//             let scores = game.players.scores()
//             const out = names.map( (n,i) => [ n, scores[i] ] )
//             res.json( out )
//         } else {
//             res.json( [] )
//         }
//     })
//     async function joinGame(/*username*/) {
//         const username = this.request.user.username
//         gameDebugMessage(username, 'wants to joinGame',this.id,JSON.stringify(this.request.user))
//         const id = this.id
//         // get latest score if exists and add player
//         User.findOne( { username } )
//             .then( u => game.addPlayer( id, username, u.score ) )
//             .catch( u => game.addPlayer( id, username ) ) // TODO : remove ?
//             .then( o => {
//                 if ( o === 0 ){
//                     gameDebugMessage(username, 'joined game' )
//                     this.emit( Constants.MSG_TYPES.JOINED_GAME_OK )
//                 } else {
//                     gameDebugMessage(username, 'could not join game' )
//                     this.emit( Constants.MSG_TYPES.JOINED_GAME_KO, o )
//                 }
//             })
//     }
//     function handleInput(dir) {
//         game.handleInput(this.id,dir)
//     }
//     function onDisconnect() {
//         const username = this.request.user.username
//         gameDebugMessage( username,'is disconnected' )
//         game.removePlayer(this.id)
//     }
//     async function handleKeyboardMapping( keyboardMapping ){
//         const username = this.request.user.username
//         gameDebugMessage( username, 'maps keys' )
//         const rez = await User.updateKeyboardMapping( username, keyboardMapping )
//     }
// }

