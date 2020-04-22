const express = require('express')
const webpack = require('webpack')
const webpackDevMiddleware = require('webpack-dev-middleware')
const socketio = require('socket.io')
const mongoose = require('mongoose')
const passport = require('passport')
const LocalStrategy = require('passport-local')
const Constants = require('../shared/constants')
const { User, loginOrCreate } = require('./user.js')
const flash = require('express-flash');
const { loginPage } = require('./loginpage.js')

/*
 * db connection
 */
const localcs = 'mongodb://127.0.0.1:27017/TodoApp'
mongoose.connect(process.env.MONGOLAB_URI || localcs, {useNewUrlParser: true} )
console.info('using db',process.env.MONGOLAB_URI || localcs )

/*
 * Passport 
 */
function checkIfUserIsLoggedIn(req, res, next) {
    console.log('=> check if logged in')
    if (req.user) {
        next()
    } else {
        res.redirect('/login')
    }
}

passport.serializeUser( (user, done) => done(null, user) )
passport.deserializeUser( (user, done) => done(null, user) )
passport.use( new LocalStrategy( loginOrCreate ) )

/*
 * Express
 */
const app = express()
// app.use(require('serve-static')(__dirname + '/../../public'))
const cookieParser = require('cookie-parser')
app.use(cookieParser())
app.use(require('body-parser').urlencoded({ extended: true }))

/*
 * Session
 */
const expressSession = require('express-session')
const MongoStore = require('connect-mongo')(expressSession)
const SESSION_SECRET = 'securedbynumberandspecialsign$5'
const sessionStore = new MongoStore({ mongooseConnection: mongoose.connection })
      
app.use(expressSession({
    secret: SESSION_SECRET,
    resave: true,
    saveUninitialized: true,
    store : sessionStore
}))
app.use(flash())
app.use(passport.initialize())

const passportSession = passport.session()
app.use(passportSession)

/*
 * endpoints
 */
app.post('/login',
         passport.authenticate('local', {
             successRedirect: '/',
             failureRedirect: '/login',
             failureFlash : true
         }))
app.get('/logout',
        (req, res) => {
            console.log('logs out')
            req.logout()
            res.redirect('/')
        })
app.post('/delete',  [
    checkIfUserIsLoggedIn,
    ( req, res) => {
        const username = req.user.username
        req.logout()
        console.log('delete account',username)
        User.deleteOne({ username }).then( x => console.log('deleted',username) )
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
        res.send(users.map( ({username,score,passwordHash}) => ({username,score,passwordHash}) ) )
    })
})


/*
 * Start Http server
 */
const port = process.env.PORT || 3000
const server = app.listen(port)
console.log(`Server listening on port ${port}`)

/*
 * socket.io 
 */
const io = socketio(server)

/*  
 * passport socket io 
 */
const passportSocketIo = require("passport.socketio");
function onAuthorizeSuccess(data, accept){
    const user = data.user
    console.log('successful connection to socket.io', user)
    accept(null, true);
}

function onAuthorizeFail(data, message, error, accept){
    if (error) throw new Error(message);
    console.log('failed connection to socket.io:', message);
    accept(null, false);
}
io.use(passportSocketIo.authorize({
    cookieParser: cookieParser,       // the same middleware you registrer in express
    key:          'connect.sid',       // the name of the cookie where express/connect stores its session_id
    secret:       SESSION_SECRET,    // the session_secret to parse the cookie
    store:        sessionStore,        // we NEED to use a sessionstore. no memorystore please
    success:      onAuthorizeSuccess,  // *optional* callback on success - read more below
    fail:         onAuthorizeFail,     // *optional* callback on fail/error - read more below
}));


/*
 * Listen for socket.io connections
 */
io.on('connection', socket => {

    console.log('connexion', socket.id)
    const user = socket.request.user
    if ( user && user.logged_in ){
        
        const { username, score } = user
        const yourInfo = { username, score }
        console.log('io connected', { yourInfo } , Constants.MSG_TYPES.YOUR_INFO)
        setTimeout( () => {
            socket.emit(Constants.MSG_TYPES.YOUR_INFO, yourInfo )
        },1000)
        socket.on(Constants.MSG_TYPES.JOIN_GAME, joinGame)
        socket.on(Constants.MSG_TYPES.INPUT, handleInput)
        socket.on('disconnect', onDisconnect)
    }
    

})

/*
 * Setup the Game
 */

import { Game } from '../../game.js'

function tellPlayer( socketId, update ){
    //    console.log('got to tell', socketId, update)
    io.to(`${socketId}`).emit( Constants.MSG_TYPES.GAME_UPDATE, update )
}
function tellScore( name, score ){
    console.log(name,'quits with score',JSON.stringify(score) )
    User.updateOne( { username : name },
                    //{ $inc : { score : score.total } },
                    { score : score.total },
                    { upsert : false } )
        .then( x => console.log('update!YES',x))
        .catch( x => console.log('update!NO',x))
}
const game = new Game( { tellPlayer, tellScore } )
// TOOO : remove ?
app.get('/stats/players', function(req, res, next) {
    if ( game && game.players ){
        let names = game.players.names()
        let scores = game.players.scores()
        const out = names.map( (n,i) => [ n, scores[i] ] )
        console.log( out )
        res.json( out )
    } else {
        res.json( [] )
    }
})
async function joinGame(/*username*/) {
    const username = this.request.user.username
    console.log('joinGame',this.id,username,this.request.user)
    const id = this.id
    // get latest score if exists and add player
    User.findOne( { username } )
        .then( u => game.addPlayer( id, username, u.score ) )
        .catch( u => game.addPlayer( id, username ) ) // TODO : remove ?
        .then( o => {
            if ( o === 0 ){
                this.emit( Constants.MSG_TYPES.JOINED_GAME_OK )
            } else {
                this.emit( Constants.MSG_TYPES.JOINED_GAME_KO, o )
            }
        })
}
function handleInput(dir) {
    game.handleInput(this.id,dir)
}
function onDisconnect() {
    game.removePlayer(this.id)
}
