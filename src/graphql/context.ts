import { FastifyReply, FastifyRequest } from "fastify";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import mercurius from "mercurius";
import { options } from "../config";
import * as db from "../db";

export const buildContext = async (req: FastifyRequest, _reply: FastifyReply) => {
  return {
    authorization: req.headers.authorization,
    db,
    network: options.network,
  };
};

type PromiseType<T> = T extends PromiseLike<infer U> ? U : T;

declare module "mercurius" {
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  interface MercuriusContext extends PromiseType<ReturnType<typeof buildContext>> {}
}
