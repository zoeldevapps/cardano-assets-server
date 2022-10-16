import Fastify, { FastifyInstance, RouteShorthandOptions } from "fastify";
import { options } from "./config";

const server: FastifyInstance = Fastify({});

const opts: RouteShorthandOptions = {
  schema: {
    response: {
      200: {
        type: "object",
        properties: {
          pong: {
            type: "string",
          },
        },
      },
    },
  },
};

server.get("/ping", opts, async (request, reply) => {
  return { pong: "it worked!" };
});

export const startServer = async () => {
  await server.listen({ host: "0.0.0.0", port: options.port });

  const address = server.server.address();
  const port = typeof address === "string" ? address : address?.port;
  console.log(`Listening on ${port}`);
};
