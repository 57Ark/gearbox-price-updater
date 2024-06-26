import dotenv from "dotenv";

import { NetworkConfig } from "../types/network.types";
import { PriceOracleConfig } from "../types/priceOracle.types";

dotenv.config({ path: "./.env" });

export const PRIVATE_KEY = process.env.PRIVATE_KEY ?? "";

export const NETWORKS: NetworkConfig[] = [
  {
    name: "Ethereum",
    chainId: 1,
    rpc: "https://eth.drpc.org",
    blocksRange: 1000000,
  },
  {
    name: "Arbitrum",
    chainId: 42161,
    rpc: "https://arbitrum.rpc.subquery.network/public",
    blocksRange: 10000000,
  },
  {
    name: "Optimism",
    chainId: 10,
    rpc: "https://optimism.llamarpc.com",
    blocksRange: 10000000,
  },
];

export const PRICE_ORACLES: Record<number, PriceOracleConfig> = {
  1: {
    address: "0x599f585D1042A14aAb194AC8031b2048dEFdFB85",
    deployBlock: 18797638,
  },
  42161: {
    address: "0xF6C709a419e18819dea30248f59c95cA20fd83d5",
    deployBlock: 184650373,
  },
  10: {
    address: "0xbb3970A9E68ce2e2Dc39fE702A3ad82cfD0eDE7F",
    deployBlock: 118413959,
  },
};

export const SAFE_ADDRESSES: Record<number, string> = {
  1: process.env.ETHEREUM_SAFE_ADDRESS ?? "",
  42161: process.env.ARBITRUM_SAFE_ADDRESS ?? "",
  10: process.env.OPTIMISM_SAFE_ADDRESS ?? "",
};

export const ACCEPTABLE_PRICE_FEED_TYPES: string[] = [
  "YEARN_ORACLE",
  "WSTETH_ORACLE",
  "WRAPPED_AAVE_V2_ORACLE",
  "COMPOUND_V2_ORACLE",
  "ERC4626_VAULT_ORACLE",
  "CURVE_USD_ORACLE",

  "CURVE_2LP_ORACLE",
  "CURVE_3LP_ORACLE",
  "CURVE_4LP_ORACLE",
  "CURVE_CRYPTO_ORACLE",
  "BALANCER_WEIGHTED_LP_ORACLE",
  "BALANCER_STABLE_LP_ORACLE",
];

export const PRICE_FEED_TYPE_ASSETS_QUANTITY: Record<string, number> = {
  YEARN_ORACLE: 1,
  WSTETH_ORACLE: 1,
  WRAPPED_AAVE_V2_ORACLE: 1,
  COMPOUND_V2_ORACLE: 1,
  ERC4626_VAULT_ORACLE: 1,
  CURVE_USD_ORACLE: 1,

  CURVE_2LP_ORACLE: 2,
  CURVE_3LP_ORACLE: 3,
  CURVE_4LP_ORACLE: 4,
  CURVE_CRYPTO_ORACLE: 3,
  BALANCER_WEIGHTED_LP_ORACLE: 8,
  BALANCER_STABLE_LP_ORACLE: 5,
};
