import { ApolloServer } from 'apollo-server-express';
import { PubSub } from 'graphql-subscriptions';
import { typeDefs } from './schema.js';
import { resolvers } from './resolvers.js';
import { verifyAccessToken } from '../utils/jwt.js';
import logger from '../utils/logger.js';

const pubsub = new PubSub();

/**
 * Create GraphQL context from request
 */
const context = async ({ req, connection }) => {
  // WebSocket connection (subscriptions)
  if (connection) {
    return {
      ...connection.context,
      pubsub,
    };
  }

  // HTTP request (queries/mutations)
  const token = req.headers.authorization?.replace('Bearer ', '');

  let user = null;
  if (token) {
    try {
      user = verifyAccessToken(token);
    } catch (error) {
      logger.warn('Invalid token in GraphQL context');
    }
  }

  return {
    user,
    pubsub,
  };
};

/**
 * Initialize Apollo Server
 */
export const createApolloServer = () => {
  const isDevelopment = process.env.NODE_ENV !== 'production';

  return new ApolloServer({
    typeDefs,
    resolvers,
    context,
    formatError: (error) => {
      logger.error('GraphQL Error:', error);

      // Hide error details in production
      if (!isDevelopment) {
        return new Error('Internal server error');
      }

      return error;
    },
    subscriptions: {
      path: '/graphql',
      onConnect: async (connectionParams) => {
        const token = connectionParams.authorization?.replace('Bearer ', '');

        if (token) {
          try {
            const user = verifyAccessToken(token);
            return { user };
          } catch (error) {
            throw new Error('Invalid token');
          }
        }

        throw new Error('Missing auth token');
      },
      onDisconnect: () => {
        logger.info('GraphQL subscription disconnected');
      },
    },
    playground: isDevelopment,
    introspection: isDevelopment,
  });
};

export { pubsub };
