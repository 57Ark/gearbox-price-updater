import { Contract, formatUnits, JsonRpcProvider } from "ethers";

import { EACAggregatorProxy__factory } from "../types/ethers-contracts";
import { getNetworkByChainId } from "./network";

interface ChainlinkPriceFeed {
  chainId: number | string;
  chainlinkPriceFeedAddress: string;
}

export const getLatestRoundData = async ({
  chainId,
  chainlinkPriceFeedAddress,
}: ChainlinkPriceFeed) => {
  const network = getNetworkByChainId(chainId);
  const provider = new JsonRpcProvider(network.rpc);

  const chainlinkPriceFeed = new Contract(
    chainlinkPriceFeedAddress,
    EACAggregatorProxy__factory.abi,
    provider,
  );
  const [{ answer }, decimals] = await Promise.all([
    chainlinkPriceFeed.latestRoundData(),
    chainlinkPriceFeed.decimals(),
  ]);

  return { latestRoundData: Number(formatUnits(answer, decimals)), decimals };
};
