import { Contract, EventLog, JsonRpcProvider } from "ethers";
import { flatten, uniq } from "lodash";

import { PriceOracleV3__factory } from "../types/ethers-contracts";
import { PriceFeedInfo } from "../types/priceFeed.types";
import { PRICE_ORACLES } from "../utils/constants";
import { getBlock } from "../utils/getBlock";
import { getNetworkByChainId } from "../utils/network";

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
