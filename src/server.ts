import Fastify, { FastifyInstance, RouteShorthandOptions } from "fastify";
import mercurius from "mercurius";
import mercuriusCodegen from "mercurius-codegen";
import { options } from "./config";
import { schema } from "./graphql/schema";
import { resolvers } from "./graphql/resolvers";
import { buildContext } from "./graphql/context";
import { uptime } from "process";
import { logger } from "./logger";

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

server.register(mercurius, {
  graphiql: options.isDevelopment,
  schema,
  resolvers,
  context: buildContext,
});

mercuriusCodegen(server, {
  // Commonly relative to your root package.json
  targetPath: "./src/graphql/generated.ts",
}).catch(console.error);

export const startServer = async () => {
  await server.listen({ host: "0.0.0.0", port: options.port });
};