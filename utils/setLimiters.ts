import SafeApiKit from "@safe-global/api-kit";
import Safe, { EthersAdapter } from "@safe-global/protocol-kit";
import { ethers, JsonRpcProvider, parseUnits, Wallet } from "ethers";

import { SingleAssetLPPriceFeed__factory } from "../types/ethers-contracts";
import { getLatestRoundData } from "./chainlink";
import {
  ACCEPTABLE_PRICE_FEED_TYPES,
  PRIVATE_KEY,
  SAFE_ADDRESSES,
} from "./constants";
import { getPriceFeeds } from "./getPriceFeedList";
import { getNetworkByChainId } from "./network";
import { getChainlinkPriceFeed, getPriceFeedType } from "./priceFeed";

export async function setLimiters(chainId: number | string) {
  const network = getNetworkByChainId(chainId);

  const priceFeedList = await getPriceFeeds(chainId);

  if (priceFeedList.length > 0) {
    console.log(
      `Found \x1b[32m${priceFeedList.length}\x1b[0m price feed contract${priceFeedList.length > 1 ? "s" : ""} on ${network.name}`,
    );
  } else {
    console.log(
      `\x1b[31mThere is no price feed contracts on ${network.name}\x1b[0m`,
    );
    return;
  }

  console.log(`Collecting price feed types on ${network.name}...`);
  const priceFeedTypeList = await Promise.all(
    priceFeedList.map(priceFeed =>
      getPriceFeedType({
        chainId,
        priceFeedAddress: priceFeed.priceFeedAddress,
      }),
    ),
  );

  const filteredPriceFeeds = priceFeedList
    .map((priceFeed, index) => ({
      ...priceFeed,
      priceFeedType: priceFeedTypeList[index].priceFeedType,
    }))
    .filter(
      ({ priceFeedType }) =>
        !!priceFeedType && ACCEPTABLE_PRICE_FEED_TYPES.includes(priceFeedType),
    );

  if (filteredPriceFeeds.length > 0) {
    console.log(
      `Found \x1b[32m${priceFeedList.length}\x1b[0m price feed contract${priceFeedList.length > 1 ? "s" : ""} of a suitable type on ${network.name}`,
    );
  } else {
    console.log(
      `\x1b[31mThere is no price feed contracts of suitable type on ${network.name}\x1b[0m`,
    );
    return;
  }

  console.log(`Collecting chainlink oracles on ${network.name}...`);
  const chainLinkPriceFeedList = await Promise.all(
    filteredPriceFeeds.map(priceFeed =>
      getChainlinkPriceFeed({
        chainId,
        priceFeedAddress: priceFeed.priceFeedAddress,
      }),
    ),
  );

  console.log(`Retrieving current prices on ${network.name}...`);
  const latestRoundData = await Promise.all(
    chainLinkPriceFeedList.map(chainLinkPriceFeed =>
      getLatestRoundData({
        chainId,
        chainlinkPriceFeedAddress: chainLinkPriceFeed.chainlinkPriceFeedAddress,
      }),
    ),
  );

  const provider = new JsonRpcProvider(network.rpc);
  const signer = new Wallet(PRIVATE_KEY, provider);
  const safeAddress = SAFE_ADDRESSES[network.chainId];

  console.log(`Sending transactions to Safe on ${network.name}...`);

  const ethAdapter = new EthersAdapter({
    ethers,
    signerOrProvider: signer,
  });

  const safeService = new SafeApiKit({ chainId: BigInt(network.chainId) });
  const safeSdk = await Safe.create({ ethAdapter, safeAddress });

  const transactions = filteredPriceFeeds.map((priceFeed, index) => {
    const newLowerBound = (
      0.99 * latestRoundData[index].latestRoundData
    ).toFixed(Number(latestRoundData[index].decimals));
    return {
      to: priceFeed.priceFeedAddress,
      data: SingleAssetLPPriceFeed__factory.createInterface().encodeFunctionData(
        "setLimiter",
        [parseUnits(newLowerBound, latestRoundData[index].decimals)],
      ),
      value: "0",
    };
  });

  const safeTransaction = await safeSdk.createTransaction({ transactions });
  const safeTxHash = await safeSdk.getTransactionHash(safeTransaction);
  const senderSignature = await safeSdk.signHash(safeTxHash);

  await safeService.proposeTransaction({
    safeAddress,
    safeTransactionData: safeTransaction.data,
    safeTxHash,
    senderAddress: signer.address,
    senderSignature: senderSignature.data,
    origin: `Set limiter for ${filteredPriceFeeds.length} price feed${filteredPriceFeeds.length > 1 ? "s" : ""}`,
  });

  console.log(
    `\x1b[32mSent ${transactions.length} transaction${transactions.length > 1 ? "s" : ""} to Safe on ${network.name}\x1b[0m`,
  );
}
