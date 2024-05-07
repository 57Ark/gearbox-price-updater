import { NETWORKS } from "./constants";

export const getNetworkByChainId = (chainId: number | string) => {
  const network = NETWORKS.find(network => network.chainId === Number(chainId));

  if (!network) {
    throw new Error("Network with this Chain ID doesn't exists");
  }

  return network;
};
