const express = require('express');
const webpack = require('webpack');
const webpackDevMiddleware = require('webpack-dev-middleware');
const socketio = require('socket.io');
const mongoose = require('mongoose')
const passport = require('passport')
const LocalStrategy = require('passport-local')
const Constants = require('../shared/constants');

const localcs = 'mongodb://127.0.0.1:27017/TodoApp'
mongoose.connect(process.env.MONGOLAB_URI || localcs, {useNewUrlParser: true} );
// mongoose.connect('mongodb://localhost:27017/test', {useNewUrlParser: true});
console.log('============== mongo : ')
console.log(process.env.MONGOLAB_URI)
console.log('==============')
/**
 *
 */
/*app.get('/orders', loggedIn, function(req, res, next) {
    // req.user - will exist
    // load user orders and render them
});*/
const Schema = mongoose.Schema;
const UserSchema = new Schema({
    username: String,
    score : String
})
UserSchema.statics.findByUsername = function(username) {
    return this.find({ username: new RegExp(username, 'i') });
};
const User = mongoose.model('User', UserSchema);

const kitty = new User({ username: 'Zildjian', score : "12" });
kitty.save().then(() => console.log('meow'));
/**
 *
 */

/*
User.findByUsername('Zildjian').exec(function(err, animals) {
    console.log('found',animals.length,'Zildjian');
});
*/
///
// const uri = "mongodb+srv://statistician:<password>@cluster0-3fkkv.mongodb.net/test?retryWrites=true&w=majority";
// const client = new MongoClient(uri, { useNewUrlParser: true });
// client.connect(err => {
//   const collection = client.db("test").collection("devices");
//   // perform actions on the collection object
//   client.close();
// });
//
/**

 */
function loggedIn(req, res, next) {
    if (req.user) {
        next();
    } else {
        res.redirect('/login');
    }
}
passport.serializeUser(function(user, done) {
  done(null, user);
});
passport.deserializeUser(function(user, done) {
  done(null, user);
});
passport.use(new LocalStrategy(
    function(username, password, done) {
        if ( Math.random() > 0.5 ){
            console.log(username,'no')
            return done( null, false,  { message: 'Incorrect username.' } )
        } else {
            console.log(username,'yes')
            let user = { username }
            return done( null,  user )
        }
/*        username = 'Zildjian'
        User.findByUsername( username, function (err, user) {
            console.log('yes!',err,user)
            
            if (err) { return done(err); }
            if (!user) { return done(null, false); }
            //if (!user.verifyPassword(password)) { return done(null, false); }
            return done(null, user);
        });*/
    }
));

const app = express();
// app.use(require('serve-static')(__dirname + '/../../public'));
app.use(require('cookie-parser')());
app.use(require('body-parser').urlencoded({ extended: true }));

///*
const expressSession = require('express-session')
const MongoStore = require('connect-mongo')(expressSession)
app.use(expressSession({
    secret: 'itisnotasession',
    resave: true,
    saveUninitialized: true,
    store : new MongoStore({ mongooseConnection: mongoose.connection })
}))

//app.use(expressSession);
//*/
//const expressSession = require('express-session')
//const MongoStore = require('connect-mongo')(expressSession);
/*
app.use(expressSession({
    store: new MongoStore({ mongooseConnection: mongoose.connection })
}))
*/
app.use(passport.initialize());

const passportSession = passport.session()
app.use(passportSession);

app.post('/login',
         passport.authenticate('local', { successRedirect: '/',
                                          failureRedirect: '/login' }));
app.get('/logout', function(req, res){
  req.logout();
  res.redirect('/');
});

const Forms = {
    a : () => {
        
    }
}

app.get('/login',
        function (req, res) {
            console.log('ask login but',req.user )

            let userZone = ''
            userZone = JSON.stringify( req.user )

            let passZone
            let html = [
                // '<html>',
                // '<head>',
                // '</head>',
                // '<body>',
                userZone,
                '<form action="/login" method="post">',
                '<div><label>Username:</label><input type="text" name="username"/></div>',
                '<div><label>Password:</label><input type="password" name="password"/></div>',
                '<div><input type="submit" value="Log In"/>',
                '</div>',
                '</form>',
                // '</body>',
                // '</html>'
            ]
            res.send( html.join("\n") )
        });



// Setup an Express server

//app.get('/', passport.authenticate('local', { failureRedirect: '/login' }))

if (process.env.NODE_ENV === 'development') {
  // Setup Webpack for development
    const webpackConfig = require('../../../webpack.dev.js');
    const compiler = webpack(webpackConfig);
    app.use(webpackDevMiddleware(compiler));
} else {
    // Static serve the dist/ folder in production
    app.use('/',[loggedIn,express.static('dist')]);
}


// Listen on port
const port = process.env.PORT || 3000;
const server = app.listen(port);
console.log(`Server listening on port ${port}`);

// Setup socket.io
const io = socketio(server);
//const sharedsession = require("express-socket.io-session");
 
//const X = passportSession
/*io.use(sharedsession(X, {
    autoSave:true
}))*/

// Listen for socket.io connections
io.on('connection', socket => {
//    console.log('iooioi',socket.handshake)
    console.log('connexion', socket.id);
    socket.on(Constants.MSG_TYPES.JOIN_GAME, joinGame);
    socket.on(Constants.MSG_TYPES.INPUT, handleInput);
    socket.on('disconnect', onDisconnect);
});

/*
 * Setup the Game
 */

import { Game } from '../../game.js'

function tellPlayer( socketId, update ){
//    console.log('got to tell', socketId, update)
    io.to(`${socketId}`).emit( Constants.MSG_TYPES.GAME_UPDATE, update )
}
const game = new Game( { tellPlayer } )


function joinGame(username) {
    console.log('joinGame',this.id,username)
    game.addPlayer(this.id, username);
}

function handleInput(dir) {
//    console.log('handleInput',this.id,dir)
    game.handleInput(this.id,dir);
}

function onDisconnect() {
    console.log('onDisconnect',this.id)
    game.removePlayer(this.id);
}
