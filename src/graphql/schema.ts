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
    cip25: CIP25Metadata

    """
    In case there was a CIP27 Royalty information attached
    to the policy ID
    """
    royalty: Royalty

    """
    CIP68 only defines how the data is stored and not their format
    """
    cip68nft: CIP25Metadata
    cip68ft: OffchainMetadata

    """
    Available total supply as stringified BigInt
    """
    supply: String

    _dbId: Int!
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

  """
  Metadata coming from the CIP-25 standard
  https://cips.cardano.org/cips/cip25/
  """
  type CIP25Metadata {
    """
    The name of the token. Should be always set
    """
    name: String!

    """
    Should be a valid Uniform Resource Identifier (URI)
    pointing to a resource with mime type image/*.
    Note that this resource is used as thumbnail or the actual link if the NFT is an image (ideally <= 1MB).
    But this is not strictly followed.
    """
    image: String!

    """
    mime type of the image behind the image url
    """
    mediaType: String

    """
    Description of the image
    """
    description: String

    """
    JSON encoded additional metadata.
    Often the metadta would include some extra properties or ID
    """
    otherProperties: String
  }

  """
  Metadata coming from the CIP-27 standard
  https://cips.cardano.org/cips/cip27/
  """
  type Royalty {
    """
    The "rate" key tag can be any floating point value from 0.0 to 1.0, to represent
    between 0 and 100 percent. For example, a 12.5 percent royalty would be
    represented with "rate": "0.125"
    """
    rate: String!

    """
    A single payment address.
    This payment address could be part of a smart contract, which should allow
    for greater flexibility of royalties distributions, controlled by the asset creator.
    """
    addr: String!
  }
`;
