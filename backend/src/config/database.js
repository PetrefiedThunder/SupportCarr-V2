import mongoose from 'mongoose';
import logger from '../utils/logger.js';
import config from './index.js';

/**
 * MongoDB connection handler with retry logic
 */
class Database {
  constructor() {
    this.connection = null;
  }

  /**
   * Connect to MongoDB
   */
  async connect() {
    try {
      const uri = config.env === 'test' ? config.db.testUri : config.db.uri;

      mongoose.set('strictQuery', false);

      this.connection = await mongoose.connect(uri, config.db.options);

      logger.info(`MongoDB connected: ${this.connection.connection.host}`);

      // Handle connection events
      mongoose.connection.on('error', (err) => {
        logger.error('MongoDB connection error:', err);
      });

      mongoose.connection.on('disconnected', () => {
        logger.warn('MongoDB disconnected');
      });

      mongoose.connection.on('reconnected', () => {
        logger.info('MongoDB reconnected');
      });

      // Graceful shutdown
      process.on('SIGINT', async () => {
        await this.disconnect();
        process.exit(0);
      });

      return this.connection;
    } catch (error) {
      logger.error('MongoDB connection failed:', error);
      throw error;
    }
  }

  /**
   * Disconnect from MongoDB
   */
  async disconnect() {
    try {
      if (this.connection) {
        await mongoose.connection.close();
        logger.info('MongoDB connection closed');
      }
    } catch (error) {
      logger.error('Error closing MongoDB connection:', error);
      throw error;
    }
  }

  /**
   * Clear all collections (for testing)
   */
  async clearDatabase() {
    if (config.env !== 'test') {
      throw new Error('Cannot clear database in non-test environment');
    }

    const collections = mongoose.connection.collections;

    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }

    logger.info('Database cleared');
  }

  /**
   * Drop database (for testing)
   */
  async dropDatabase() {
    if (config.env !== 'test') {
      throw new Error('Cannot drop database in non-test environment');
    }

    await mongoose.connection.dropDatabase();
    logger.info('Database dropped');
  }
}

export default new Database();
