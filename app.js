require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const flash = require('connect-flash');
const expressSession = require('express-session');

const db = require('./config/mongoose-connection');
const indexRouter = require('./routes/index');
const ownersRouter = require('./routes/ownersRouter');
const productsRouter = require('./routes/productsRouter');
const usersRouter = require('./routes/usersRouter');
const checkoutRouter = require('./routes/checkout');
const chatRouter = require('./routes/chatRouter')
const { default: mongoose } = require('mongoose');
const ResponseHandler = require('./utils/responseHandle');
const MongoStore = require('connect-mongo')

const app = express();

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));


// Middleware
app.use(express.json());  
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Session configuration
const sessionSecret = process.env.JWT_KEY;
if (!sessionSecret) {
  console.error('EXPRESS_SESSION_SECRET is not set. Please set this environment variable.');
  if (process.env.NODE_ENV !== 'production') {
    mongoose.set('debug', true);
  }
}

app.use(
  expressSession({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: 'mongodb+srv://pratyushbhargava6:az3CycSvzhmLyYfB@cluster0.wcg4j.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0'
    }),
    cookie: { 
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true
    }
  })
);



if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

app.use(flash());

app.use((req, res, next) => {
  res.set({
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'X-XSS-Protection': '1; mode=block'
  });
  next();
})

// Routes
app.use('/', indexRouter);
app.use('/owners', ownersRouter);
app.use('/users', usersRouter);
app.use('/products', productsRouter);
app.use('/checkout', checkoutRouter)
app.use('/chatbot', chatRouter)

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  return ResponseHandler.error( res, err, 500)
});

app.get('/health', async (req, res) => {
  try {
    const dbState = mongoose.connection.readyState;
    const states = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };
    res.json({
      status: 'ok',
      database: states[dbState],
      timestamp: new Date()
    });
  } catch (error) {
    res.status(500).json({ status: 'error', error: error.message });
  }
});
  
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
  });



