import { parseUnits } from "ethers";

import { SingleAssetLPPriceFeed__factory } from "../types/ethers-contracts";
import { ACCEPTABLE_PRICE_FEED_TYPES } from "./constants";
import { getNetworkByChainId } from "./network";
import {
  getLatestRoundData,
  getPriceFeeds,
  getPriceFeedType,
} from "./priceFeed";
import { uploadTransactionToSafe } from "./safe";

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

  console.log(`Retrieving current prices on ${network.name}...`);
  const latestRoundData = await Promise.all(
    filteredPriceFeeds.map(priceFeed =>
      getLatestRoundData({
        chainId,
        priceFeedAddress: priceFeed.priceFeedAddress,
        priceFeedType: priceFeed.priceFeedType ?? "",
      }),
    ),
  );

  console.log(`Sending transactions to Safe on ${network.name}...`);

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

  await uploadTransactionToSafe({ chainId, transactions });

  console.log(
    `\x1b[32mSent ${transactions.length} transaction${transactions.length > 1 ? "s" : ""} to Safe on ${network.name}\x1b[0m`,
  );
}
