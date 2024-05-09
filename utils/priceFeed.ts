import { PriceFeedType } from "@gearbox-protocol/sdk-gov";
import { isZeroAddress } from "@safe-global/protocol-kit/dist/src/utils";
import { Contract, id, JsonRpcProvider } from "ethers";
import { minBy } from "lodash";

import {
  IPriceFeedType__factory,
  MultipleAssetLPPriceFeed__factory,
  SingleAssetLPPriceFeed__factory,
} from "../types/ethers-contracts";
import { getChainlinkLatestRoundData } from "./chainlink";
import { PRICE_FEED_TYPE_ASSETS_QUANTITY } from "./constants";
import { getNetworkByChainId } from "./network";

interface PriceFeed {
  chainId: number | string;
  priceFeedAddress: string;
}

interface IndexedPriceFeed extends PriceFeed {
  index?: number;
}

interface PriceFeedWithType extends PriceFeed {
  priceFeedType: string;
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
  index,
}: IndexedPriceFeed) => {
  const network = getNetworkByChainId(chainId);
  const provider = new JsonRpcProvider(network.rpc);

  if (index === undefined) {
    const priceFeed = new Contract(
      priceFeedAddress,
      SingleAssetLPPriceFeed__factory.abi,
      provider,
    );

    const chainlinkPriceFeedAddress: string = await priceFeed.priceFeed();

    return { priceFeedAddress, chainlinkPriceFeedAddress };
  }

  const priceFeed = new Contract(
    priceFeedAddress,
    MultipleAssetLPPriceFeed__factory.abi,
    provider,
  );

  const chainlinkPriceFeedAddress: string =
    await priceFeed[`priceFeed${index}`]();

  return { priceFeedAddress, chainlinkPriceFeedAddress };
};

export const getLatestRoundData = async ({
  chainId,
  priceFeedAddress,
  priceFeedType,
}: PriceFeedWithType) => {
  const assetsNumber = PRICE_FEED_TYPE_ASSETS_QUANTITY[priceFeedType];
  if (assetsNumber > 1) {
    const priceFeedList = await Promise.all(
      new Array(assetsNumber)
        .fill(0)
        .map((_, index) =>
          getChainlinkPriceFeed({ chainId, priceFeedAddress, index }),
        ),
    );

    const filteredPriceFeedList = priceFeedList.filter(
      priceFeed => !isZeroAddress(priceFeed.chainlinkPriceFeedAddress),
    );

    const latestRoundDataList = await Promise.all(
      filteredPriceFeedList.map(priceFeed =>
        getChainlinkLatestRoundData({
          chainId,
          chainlinkPriceFeedAddress: priceFeed.chainlinkPriceFeedAddress,
        }),
      ),
    );

    const cheapestPrice = minBy(latestRoundDataList, "latestRoundData");

    if (!cheapestPrice) {
      throw new Error("Unable to determine asset with the cheapet price");
    }

    return { ...cheapestPrice, priceFeedAddress };
  }

  const priceFeed = await getChainlinkPriceFeed({ chainId, priceFeedAddress });
  const latestRoundData = await getChainlinkLatestRoundData({
    chainId,
    chainlinkPriceFeedAddress: priceFeed.chainlinkPriceFeedAddress,
  });

  return { ...latestRoundData, priceFeedAddress };
};
