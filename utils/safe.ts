import SafeApiKit from "@safe-global/api-kit";
import Safe, {
  CreateTransactionProps,
  EthersAdapter,
} from "@safe-global/protocol-kit";
import { ethers, JsonRpcProvider, Wallet } from "ethers";

import { PRIVATE_KEY, SAFE_ADDRESSES } from "./constants";
import { getNetworkByChainId } from "./network";

interface UploadTransactionToSafeProps extends CreateTransactionProps {
  chainId: number | string;
}

export async function uploadTransactionToSafe({
  chainId,
  transactions,
}: UploadTransactionToSafeProps) {
  const network = getNetworkByChainId(chainId);

  const provider = new JsonRpcProvider(network.rpc);
  const signer = new Wallet(PRIVATE_KEY, provider);
  const safeAddress = SAFE_ADDRESSES[network.chainId];

  const ethAdapter = new EthersAdapter({
    ethers,
    signerOrProvider: signer,
  });

  const safeService = new SafeApiKit({ chainId: BigInt(network.chainId) });
  const safeSdk = await Safe.create({ ethAdapter, safeAddress });

  const safeTransaction = await safeSdk.createTransaction({ transactions });
  const safeTxHash = await safeSdk.getTransactionHash(safeTransaction);
  const senderSignature = await safeSdk.signHash(safeTxHash);

  await safeService.proposeTransaction({
    safeAddress,
    safeTransactionData: safeTransaction.data,
    safeTxHash,
    senderAddress: signer.address,
    senderSignature: senderSignature.data,
    origin: `Set limiter for ${transactions.length} price feed${transactions.length > 1 ? "s" : ""}`,
  });
}
