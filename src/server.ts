import Fastify, { FastifyInstance, RouteShorthandOptions } from "fastify";
import cors from "@fastify/cors";
import mercurius from "mercurius";
import mercuriusCodegen from "mercurius-codegen";
import { options } from "./config";
import { schema } from "./graphql/schema";
import { resolvers, loaders } from "./graphql/resolvers";
import { buildContext } from "./graphql/context";
import { uptime } from "process";
import { logger } from "./logger";
import { getCorsOptions } from "./cors";

const server: FastifyInstance = Fastify({
  logger,
});

const opts: RouteShorthandOptions = {
  schema: {
    response: {
      200: {
        type: "object",
        properties: {
          uptime: {
            type: "number",
          },
        },
      },
    },
  },
};

server.get("/health", opts, async (request, reply) => {
  return { uptime: uptime() };
});

server.register(cors, getCorsOptions(options.cors, !options.isDevelopment));
mercuriusCodegen(server, {
  // Commonly relative to your root package.json
  targetPath: "./src/graphql/generated.ts",
}).catch(logger.error.bind(logger));

server.register(mercurius, {
  graphiql: options.isDevelopment,
  schema,
  resolvers,
  loaders,
  context: buildContext,
  allowBatchedQueries: true,
});

export const startServer = async () => {
  await server.listen({ host: "0.0.0.0", port: options.port });
};
