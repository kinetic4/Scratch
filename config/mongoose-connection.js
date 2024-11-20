// config/mongoose-connection.js
const mongoose = require('mongoose');
const debug = require('debug')('development:mongoose');
const config = require('config');

const connectDB = async () => {
  try {
    // Get MongoDB URI based on environment
    let mongoURI;
    if (process.env.NODE_ENV === 'production') {
      mongoURI = process.env.MONGODB_URI; // Use environment variable in production
    } else {
      mongoURI = config.get("MONGODB_URI"); // Use config in development
    }

    if (!mongoURI) {
      throw new Error('MongoDB URI is not defined');
    }

    const conn = await mongoose.connect(mongoURI, {
      // useNewUrlParser: true,
      // useUnifiedTopology: true,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    debug('MongoDB Connected');
    console.log(`MongoDB Connected: ${conn.connection.host}`);

    // Handle MongoDB events
    mongoose.connection.on('connected', () => {
      debug('MongoDB connected event triggered');
    });

    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
      debug('MongoDB connection error: %O', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected. Attempting to reconnect...');
      debug('MongoDB disconnected');
      setTimeout(connectDB, 5000); // Try to reconnect after 5 seconds
    });

    // Handle application termination
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('MongoDB connection closed through app termination');
      process.exit(0);
    });

    return conn.connection;

  } catch (error) {
    console.error('MongoDB connection error:', error);
    debug('MongoDB connection error: %O', error);
    
    // Don't exit in production, try to reconnect
    if (process.env.NODE_ENV === 'production') {
      console.log('Retrying connection in 5 seconds...');
      setTimeout(connectDB, 5000);
    } else {
      process.exit(1);
    }
  }
};

// Create config/default.json and config/production.json
const setupConfig = () => {
  try {
    // This will be used if config files don't exist
    const defaultConfig = {
      MONGODB_URI: process.env.MONGODB_URI
    };

    return defaultConfig;
  } catch (error) {
    console.error('Error setting up config:', error);
    return {
      MONGODB_URI: process.env.MONGODB_URI
    };
  }
};

// Initialize connection
const connection = connectDB();

module.exports = connection;