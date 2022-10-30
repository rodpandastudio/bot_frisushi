const mongoose = require('mongoose');
mongoose.connect(process.env.DB_HOST)
  .then(db => console.log('DB is connected'))
  .catch(err => console.log(err));
