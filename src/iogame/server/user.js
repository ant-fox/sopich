const mongoose = require('mongoose')


const Schema = mongoose.Schema;
const UserSchema = new Schema({
    username: String,
    score : Number,
    passwordHash : String
})
UserSchema.statics.findByUsername = function(username) {
    //return this.find({ username: new RegExp(username, 'i') });
    return this.find({ username })
};
export const User = mongoose.model('User', UserSchema);
