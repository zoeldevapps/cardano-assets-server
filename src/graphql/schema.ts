import { gql } from "mercurius-codegen";

export const schema = gql`
  type Query {
    asset(subject: ID!): Asset
  }

  type Asset {
    """
    Assets ID is based on policyId
    """
    id: ID!
    policyId: String!
    assetName: String!
    fingerprint: String!
    common: CommonMetadata!
    offchain: OffchainMetadata
  }

  """
  Common metadata aggregated from various sources or calculated
  """
  type CommonMetadata {
    """
    Name of the token or if possible the utf-8 decoded asset name
    """
    name: String!

    """
    If available show a description
    """
    description: String

    """
    Image uri or link to the logo
    """
    image: String

    """
    Decimals, by default set to '0' if there is no metadata found or NFT
    """
    decimals: Int!
  }

  """
  Metadata coming from the github token registry for cardano
  https://github.com/cardano-foundation/cardano-token-registry#semantic-content-of-registry-entries
  """
  type OffchainMetadata {
    """
    The base16-encoded policyId + base16-encoded assetName
    """
    subject: String!

    """
    A human-readable name for the subject, suitable for use in an interface
    """
    name: String!

    """
    A human-readable description for the subject, suitable for use in an interface
    """
    description: String!

    """
    The base16-encoded CBOR representation of the monetary policy script, used to verify ownership.
    Optional in the case of Plutus scripts as verification is handled elsewhere.
    """
    policy: String

    """
    A human-readable ticker name for the subject, suitable for use in an interface.
    """
    ticker: String

    """
    A HTTPS URL (web page relating to the token)
    """
    url: String

    """
    A PNG image file as a byte string
    """
    logo: String

    """
    how many decimals to the token
    """
    decimals: Int
  }
`;
