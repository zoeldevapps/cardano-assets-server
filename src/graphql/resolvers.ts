import { IResolvers } from "mercurius";

export const resolvers: IResolvers = {
  Query: {
    hello(root, { name }, ctx, info) {
      // root ~ {}
      // name ~ string
      // ctx.authorization ~ string | undefined
      // info ~ GraphQLResolveInfo
      return "hello " + name;
    },
  },
};
