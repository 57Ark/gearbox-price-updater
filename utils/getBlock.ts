import { JsonRpcProvider } from "ethers";

import { getNetworkByChainId } from "./network";

export const getBlock = async (chainId: number | string) => {
  const network = getNetworkByChainId(chainId);

  const provider = new JsonRpcProvider(network.rpc);
  const blockNumber = await provider.getBlockNumber();

  return blockNumber;
};
