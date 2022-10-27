import type { GraphQLResolveInfo } from "graphql";
import type { MercuriusContext } from "mercurius";
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type ResolverFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) =>
  | Promise<import("mercurius-codegen").DeepPartial<TResult>>
  | import("mercurius-codegen").DeepPartial<TResult>;
export type RequireFields<T, K extends keyof T> = Omit<T, K> & { [P in K]-?: NonNullable<T[P]> };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: string;
  String: string;
  Boolean: boolean;
  Int: number;
  Float: number;
  _FieldSet: any;
};

export type Query = {
  __typename?: "Query";
  asset?: Maybe<Asset>;
};

export type QueryassetArgs = {
  subject: Scalars["ID"];
};

export type Asset = {
  __typename?: "Asset";
  /** Assets ID is based on policyId */
  id: Scalars["ID"];
  policyId: Scalars["String"];
  assetName: Scalars["String"];
  fingerprint: Scalars["String"];
  common: CommonMetadata;
  offchain?: Maybe<OffchainMetadata>;
  cip25?: Maybe<CIP25Metadata>;
};

/** Common metadata aggregated from various sources or calculated */
export type CommonMetadata = {
  __typename?: "CommonMetadata";
  /** Name of the token or if possible the utf-8 decoded asset name */
  name: Scalars["String"];
  /** If available show a description */
  description?: Maybe<Scalars["String"]>;
  /** Image uri or link to the logo */
  image?: Maybe<Scalars["String"]>;
  /** Decimals, by default set to '0' if there is no metadata found or NFT */
  decimals: Scalars["Int"];
};

/**
 * Metadata coming from the github token registry for cardano
 * https://github.com/cardano-foundation/cardano-token-registry#semantic-content-of-registry-entries
 */
export type OffchainMetadata = {
  __typename?: "OffchainMetadata";
  /** The base16-encoded policyId + base16-encoded assetName */
  subject: Scalars["String"];
  /** A human-readable name for the subject, suitable for use in an interface */
  name: Scalars["String"];
  /** A human-readable description for the subject, suitable for use in an interface */
  description: Scalars["String"];
  /**
   * The base16-encoded CBOR representation of the monetary policy script, used to verify ownership.
   * Optional in the case of Plutus scripts as verification is handled elsewhere.
   */
  policy?: Maybe<Scalars["String"]>;
  /** A human-readable ticker name for the subject, suitable for use in an interface. */
  ticker?: Maybe<Scalars["String"]>;
  /** A HTTPS URL (web page relating to the token) */
  url?: Maybe<Scalars["String"]>;
  /** A PNG image file as a byte string */
  logo?: Maybe<Scalars["String"]>;
  /** how many decimals to the token */
  decimals?: Maybe<Scalars["Int"]>;
};

/**
 * Metadata coming from the CIP-25 standard
 * https://cips.cardano.org/cips/cip25/
 */
export type CIP25Metadata = {
  __typename?: "CIP25Metadata";
  /** The name of the token. Should be always set */
  name: Scalars["String"];
  /**
   * Should be a valid Uniform Resource Identifier (URI)
   * pointing to a resource with mime type image/*.
   * Note that this resource is used as thumbnail or the actual link if the NFT is an image (ideally <= 1MB).
   * But this is not strictly followed.
   */
  image: Scalars["String"];
  /** mime type of the image behind the image url */
  mediaType?: Maybe<Scalars["String"]>;
  /** Description of the image */
  description?: Maybe<Scalars["String"]>;
  /**
   * JSON encoded additional metadata.
   * Often the metadta would include some extra properties or ID
   */
  otherProperties?: Maybe<Scalars["String"]>;
};

export type ResolverTypeWrapper<T> = Promise<T> | T;

export type ResolverWithResolve<TResult, TParent, TContext, TArgs> = {
  resolve: ResolverFn<TResult, TParent, TContext, TArgs>;
};
export type Resolver<TResult, TParent = {}, TContext = {}, TArgs = {}> =
  | ResolverFn<TResult, TParent, TContext, TArgs>
  | ResolverWithResolve<TResult, TParent, TContext, TArgs>;

export type SubscriptionSubscribeFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => AsyncIterable<TResult> | Promise<AsyncIterable<TResult>>;

export type SubscriptionResolveFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;

export interface SubscriptionSubscriberObject<TResult, TKey extends string, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<{ [key in TKey]: TResult }, TParent, TContext, TArgs>;
  resolve?: SubscriptionResolveFn<TResult, { [key in TKey]: TResult }, TContext, TArgs>;
}

export interface SubscriptionResolverObject<TResult, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<any, TParent, TContext, TArgs>;
  resolve: SubscriptionResolveFn<TResult, any, TContext, TArgs>;
}

export type SubscriptionObject<TResult, TKey extends string, TParent, TContext, TArgs> =
  | SubscriptionSubscriberObject<TResult, TKey, TParent, TContext, TArgs>
  | SubscriptionResolverObject<TResult, TParent, TContext, TArgs>;

export type SubscriptionResolver<TResult, TKey extends string, TParent = {}, TContext = {}, TArgs = {}> =
  | ((...args: any[]) => SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>)
  | SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>;

export type TypeResolveFn<TTypes, TParent = {}, TContext = {}> = (
  parent: TParent,
  context: TContext,
  info: GraphQLResolveInfo
) => Maybe<TTypes> | Promise<Maybe<TTypes>>;

export type IsTypeOfResolverFn<T = {}, TContext = {}> = (
  obj: T,
  context: TContext,
  info: GraphQLResolveInfo
) => boolean | Promise<boolean>;

export type NextResolverFn<T> = () => Promise<T>;

export type DirectiveResolverFn<TResult = {}, TParent = {}, TContext = {}, TArgs = {}> = (
  next: NextResolverFn<TResult>,
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;

/** Mapping between all available schema types and the resolvers types */
export type ResolversTypes = {
  Query: ResolverTypeWrapper<{}>;
  ID: ResolverTypeWrapper<Scalars["ID"]>;
  Asset: ResolverTypeWrapper<Asset>;
  String: ResolverTypeWrapper<Scalars["String"]>;
  CommonMetadata: ResolverTypeWrapper<CommonMetadata>;
  Int: ResolverTypeWrapper<Scalars["Int"]>;
  OffchainMetadata: ResolverTypeWrapper<OffchainMetadata>;
  CIP25Metadata: ResolverTypeWrapper<CIP25Metadata>;
  Boolean: ResolverTypeWrapper<Scalars["Boolean"]>;
};

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = {
  Query: {};
  ID: Scalars["ID"];
  Asset: Asset;
  String: Scalars["String"];
  CommonMetadata: CommonMetadata;
  Int: Scalars["Int"];
  OffchainMetadata: OffchainMetadata;
  CIP25Metadata: CIP25Metadata;
  Boolean: Scalars["Boolean"];
};

export type QueryResolvers<
  ContextType = MercuriusContext,
  ParentType extends ResolversParentTypes["Query"] = ResolversParentTypes["Query"]
> = {
  asset?: Resolver<
    Maybe<ResolversTypes["Asset"]>,
    ParentType,
    ContextType,
    RequireFields<QueryassetArgs, "subject">
  >;
};

export type AssetResolvers<
  ContextType = MercuriusContext,
  ParentType extends ResolversParentTypes["Asset"] = ResolversParentTypes["Asset"]
> = {
  id?: Resolver<ResolversTypes["ID"], ParentType, ContextType>;
  policyId?: Resolver<ResolversTypes["String"], ParentType, ContextType>;
  assetName?: Resolver<ResolversTypes["String"], ParentType, ContextType>;
  fingerprint?: Resolver<ResolversTypes["String"], ParentType, ContextType>;
  common?: Resolver<ResolversTypes["CommonMetadata"], ParentType, ContextType>;
  offchain?: Resolver<Maybe<ResolversTypes["OffchainMetadata"]>, ParentType, ContextType>;
  cip25?: Resolver<Maybe<ResolversTypes["CIP25Metadata"]>, ParentType, ContextType>;
  isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type CommonMetadataResolvers<
  ContextType = MercuriusContext,
  ParentType extends ResolversParentTypes["CommonMetadata"] = ResolversParentTypes["CommonMetadata"]
> = {
  name?: Resolver<ResolversTypes["String"], ParentType, ContextType>;
  description?: Resolver<Maybe<ResolversTypes["String"]>, ParentType, ContextType>;
  image?: Resolver<Maybe<ResolversTypes["String"]>, ParentType, ContextType>;
  decimals?: Resolver<ResolversTypes["Int"], ParentType, ContextType>;
  isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type OffchainMetadataResolvers<
  ContextType = MercuriusContext,
  ParentType extends ResolversParentTypes["OffchainMetadata"] = ResolversParentTypes["OffchainMetadata"]
> = {
  subject?: Resolver<ResolversTypes["String"], ParentType, ContextType>;
  name?: Resolver<ResolversTypes["String"], ParentType, ContextType>;
  description?: Resolver<ResolversTypes["String"], ParentType, ContextType>;
  policy?: Resolver<Maybe<ResolversTypes["String"]>, ParentType, ContextType>;
  ticker?: Resolver<Maybe<ResolversTypes["String"]>, ParentType, ContextType>;
  url?: Resolver<Maybe<ResolversTypes["String"]>, ParentType, ContextType>;
  logo?: Resolver<Maybe<ResolversTypes["String"]>, ParentType, ContextType>;
  decimals?: Resolver<Maybe<ResolversTypes["Int"]>, ParentType, ContextType>;
  isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type CIP25MetadataResolvers<
  ContextType = MercuriusContext,
  ParentType extends ResolversParentTypes["CIP25Metadata"] = ResolversParentTypes["CIP25Metadata"]
> = {
  name?: Resolver<ResolversTypes["String"], ParentType, ContextType>;
  image?: Resolver<ResolversTypes["String"], ParentType, ContextType>;
  mediaType?: Resolver<Maybe<ResolversTypes["String"]>, ParentType, ContextType>;
  description?: Resolver<Maybe<ResolversTypes["String"]>, ParentType, ContextType>;
  otherProperties?: Resolver<Maybe<ResolversTypes["String"]>, ParentType, ContextType>;
  isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type Resolvers<ContextType = MercuriusContext> = {
  Query?: QueryResolvers<ContextType>;
  Asset?: AssetResolvers<ContextType>;
  CommonMetadata?: CommonMetadataResolvers<ContextType>;
  OffchainMetadata?: OffchainMetadataResolvers<ContextType>;
  CIP25Metadata?: CIP25MetadataResolvers<ContextType>;
};

export type Loader<TReturn, TObj, TParams, TContext> = (
  queries: Array<{
    obj: TObj;
    params: TParams;
  }>,
  context: TContext & {
    reply: import("fastify").FastifyReply;
  }
) => Promise<Array<import("mercurius-codegen").DeepPartial<TReturn>>>;
export type LoaderResolver<TReturn, TObj, TParams, TContext> =
  | Loader<TReturn, TObj, TParams, TContext>
  | {
      loader: Loader<TReturn, TObj, TParams, TContext>;
      opts?: {
        cache?: boolean;
      };
    };
export interface Loaders<
  TContext = import("mercurius").MercuriusContext & { reply: import("fastify").FastifyReply }
> {
  Asset?: {
    id?: LoaderResolver<Scalars["ID"], Asset, {}, TContext>;
    policyId?: LoaderResolver<Scalars["String"], Asset, {}, TContext>;
    assetName?: LoaderResolver<Scalars["String"], Asset, {}, TContext>;
    fingerprint?: LoaderResolver<Scalars["String"], Asset, {}, TContext>;
    common?: LoaderResolver<CommonMetadata, Asset, {}, TContext>;
    offchain?: LoaderResolver<Maybe<OffchainMetadata>, Asset, {}, TContext>;
    cip25?: LoaderResolver<Maybe<CIP25Metadata>, Asset, {}, TContext>;
  };

  CommonMetadata?: {
    name?: LoaderResolver<Scalars["String"], CommonMetadata, {}, TContext>;
    description?: LoaderResolver<Maybe<Scalars["String"]>, CommonMetadata, {}, TContext>;
    image?: LoaderResolver<Maybe<Scalars["String"]>, CommonMetadata, {}, TContext>;
    decimals?: LoaderResolver<Scalars["Int"], CommonMetadata, {}, TContext>;
  };

  OffchainMetadata?: {
    subject?: LoaderResolver<Scalars["String"], OffchainMetadata, {}, TContext>;
    name?: LoaderResolver<Scalars["String"], OffchainMetadata, {}, TContext>;
    description?: LoaderResolver<Scalars["String"], OffchainMetadata, {}, TContext>;
    policy?: LoaderResolver<Maybe<Scalars["String"]>, OffchainMetadata, {}, TContext>;
    ticker?: LoaderResolver<Maybe<Scalars["String"]>, OffchainMetadata, {}, TContext>;
    url?: LoaderResolver<Maybe<Scalars["String"]>, OffchainMetadata, {}, TContext>;
    logo?: LoaderResolver<Maybe<Scalars["String"]>, OffchainMetadata, {}, TContext>;
    decimals?: LoaderResolver<Maybe<Scalars["Int"]>, OffchainMetadata, {}, TContext>;
  };

  CIP25Metadata?: {
    name?: LoaderResolver<Scalars["String"], CIP25Metadata, {}, TContext>;
    image?: LoaderResolver<Scalars["String"], CIP25Metadata, {}, TContext>;
    mediaType?: LoaderResolver<Maybe<Scalars["String"]>, CIP25Metadata, {}, TContext>;
    description?: LoaderResolver<Maybe<Scalars["String"]>, CIP25Metadata, {}, TContext>;
    otherProperties?: LoaderResolver<Maybe<Scalars["String"]>, CIP25Metadata, {}, TContext>;
  };
}
declare module "mercurius" {
  interface IResolvers extends Resolvers<import("mercurius").MercuriusContext> {}
  interface MercuriusLoaders extends Loaders {}
}
