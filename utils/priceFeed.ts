import { PriceFeedType } from "@gearbox-protocol/sdk-gov";
import { isZeroAddress } from "@safe-global/protocol-kit/dist/src/utils";
import { Contract, EventLog, id, JsonRpcProvider } from "ethers";
import { flatten, minBy, uniq } from "lodash";

import {
  IPriceFeedType__factory,
  MultipleAssetLPPriceFeed__factory,
  PriceOracleV3__factory,
  SingleAssetLPPriceFeed__factory,
} from "../types/ethers-contracts";
import { PriceFeedInfo } from "../types/priceFeed.types";
import {
  PRICE_FEED_TYPE_ASSETS_QUANTITY,
  PRICE_ORACLES,
} from "../utils/constants";
import { getBlock } from "../utils/getBlock";
import { getNetworkByChainId } from "../utils/network";
import { getChainlinkLatestRoundData } from "./chainlink";

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

export async function getPriceFeeds(chainId: number | string) {
  const network = getNetworkByChainId(chainId);
  const provider = new JsonRpcProvider(network.rpc);

  console.log(`Collecting price feed contracts on ${network.name}...`);

  const priceOracleInfo = PRICE_ORACLES[network.chainId];
  const currentBlock = await getBlock(network.chainId);

  const blockRanges = new Array(
    Math.ceil(
      (currentBlock - priceOracleInfo.deployBlock) / network.blocksRange,
    ),
  )
    .fill(0)
    .map((_, index) => {
      const start = priceOracleInfo.deployBlock + network.blocksRange * index;
      const end = Math.min(start + network.blocksRange - 1, currentBlock);

      return {
        start,
        end,
      };
    });

  const priceOracle = new Contract(
    priceOracleInfo.address,
    PriceOracleV3__factory.abi,
    provider,
  );
  const eventFilter = priceOracle.filters.SetPriceFeed();

  const events = flatten(
    await Promise.all(
      blockRanges.map(({ start, end }) =>
        priceOracle.queryFilter(eventFilter, start, end),
      ),
    ),
  );

  const priceFeedList: PriceFeedInfo[] = uniq(
    events.map(event => ({
      priceFeedAddress: (event as EventLog).args[1],
      tokenAddress: (event as EventLog).args[0],
    })),
  );

  return priceFeedList;
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
