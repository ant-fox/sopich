const bcrypt = require('bcrypt');
const saltRounds = 10;
const mongoose = require('mongoose')
const UserSchema = new mongoose.Schema({
    username: String,
    score : Number,
    passwordHash : String,
    keyboardMapping : mongoose.Schema.Types.Mixed
})
UserSchema.statics.findByUsername = function(username) {
    return this.find({ username })
};

function checkUsernameString( x ){
    return x && ( x.length >=1 ) && ( x.length < 50 )
}
function checkPasswordString( x ){
    return x && ( x.length >=1 )
}

export const User = mongoose.model('User', UserSchema);


export async function loginOrCreate( username, password, done ){

    const OK = user => done( null, user, { message : 'success' } )
    const KO = cause => done( null, false, { message : cause } )
    
    if ( !(checkUsernameString( username ) )){
        console.log('[login]','rejext username',username)
        KO( 'wrongusername')
        return
    }    
    if ( !(checkPasswordString( password ) )){
        console.log('[login]','rejext password',password)
        KO( 'badpassword' )
        return
    }
    console.log('[login]','login or create',username,'/',password)
    const user = await User.findOne( { username } )
    if ( user ){
        console.log('[login]', username )
        if ( !user.passwordHash ){
            KO('error#22')
            return 
        }
        bcrypt.compare(password, user.passwordHash, function(err, res) {
            if ( err ){
                console.error('######',err)
            } else {
                if ( res ){
                    console.log('[login] password ok', username )
                    OK(user)
                } else {
                    console.log('[login] password NOT ok', username )
                    KO('password does not match')
                }
            }
        });
    } else {
        console.log('[login] create user',username )
        bcrypt.hash(password, saltRounds, function(err, hash) {        
            if ( !err ){
                const user = new User({ username, score : 0, passwordHash : hash })
                const s = user.save().then( x => {
                    console.log('[login]','created', username)
                    OK(user)
                }).catch( e => {
                    KO('could not create user')
                })
            } else {
                KO('error while creating hash')
            }
        });        
    }
    
    //return done('error',null)
}

