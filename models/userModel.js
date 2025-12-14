const mongoose = require('mongoose');


const userSchema = new mongoose.Schema({
  _id: { 
    type: mongoose.Schema.Types.ObjectId, 
  },
  name: {
    type:String,
    required:[true, 'Name field is required']
  },
  department: {
    type:String,
    required:[true, 'Department name field is required']
  },
  phonenumber: {
    type:Number,
    required:[true, 'Phone Number field is required'],
    minlength: [10, 'atleast 10 characters required'],
    maxlength: [10, 'atleast 10 characters required']
  },
  password: {
    type:String,
    required:[true, 'Password fields is required'],
    minlength: [6, 'atleast 6 characters required']
  },
  role:{
    type: String, enum: ['user', 'admin'], default: 'user'
  },
});

const User = mongoose.model('User', userSchema);

module.exports = User;