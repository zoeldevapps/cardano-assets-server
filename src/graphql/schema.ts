import { gql } from "mercurius-codegen";

export const schema = gql`
  type Query {
    hello(name: String!): String!
  }
`;
