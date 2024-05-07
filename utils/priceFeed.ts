import { PriceFeedType } from "@gearbox-protocol/sdk-gov";
import { Contract, id, JsonRpcProvider } from "ethers";

import {
  IPriceFeedType__factory,
  SingleAssetLPPriceFeed__factory,
} from "../types/ethers-contracts";
import { getNetworkByChainId } from "./network";

interface PriceFeed {
  chainId: number | string;
  priceFeedAddress: string;
}

export const getPriceFeedType = async ({
  chainId,
  priceFeedAddress,
}: PriceFeed) => {
  const network = getNetworkByChainId(chainId);
  const provider = new JsonRpcProvider(network.rpc);

  const bytecode = await provider.getCode(priceFeedAddress);

  if (bytecode.length <= 2) {
    return { priceFeedAddress, priceFeedType: undefined };
  }

  if (!bytecode.includes(id("priceFeedType()").slice(2, 10))) {
    return { priceFeedAddress, priceFeedType: PriceFeedType[0] };
  }

  const priceFeed = new Contract(
    priceFeedAddress,
    IPriceFeedType__factory.abi,
    provider,
  );
  const feedType: number = await priceFeed.priceFeedType();

  return { priceFeedAddress, priceFeedType: PriceFeedType[feedType] };
};

export const getChainlinkPriceFeed = async ({
  chainId,
  priceFeedAddress,
}: PriceFeed) => {
  const network = getNetworkByChainId(chainId);
  const provider = new JsonRpcProvider(network.rpc);

  const priceFeed = new Contract(
    priceFeedAddress,
    SingleAssetLPPriceFeed__factory.abi,
    provider,
  );
  const chainlinkPriceFeedAddress: string = await priceFeed.priceFeed();

  return { priceFeedAddress, chainlinkPriceFeedAddress };
};
