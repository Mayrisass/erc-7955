import { bootstrap, deployer } from "@safe-research/erc-7955";
import { useEffect, useState } from "react";
import {
  type Address,
  encodeFunctionData,
  type TransactionRequestEIP7702,
} from "viem";
import { signAuthorization } from "viem/accounts";
import { useTransactionCount } from "wagmi";

function useDeployFactoryTransaction({
  bootstrap: { address: bootstrapAddress },
}: {
  bootstrap: { address: Address | null };
}) {
  const { data: nonce } = useTransactionCount({
    address: deployer.address,
  });
  const [transaction, setTransaction] =
    useState<TransactionRequestEIP7702 | null>(null);

  useEffect(() => {
    // Set when the inputs change or the component unmounts, so that a slower,
    // older signing run cannot overwrite a newer transaction.
    let current = true;

    if (!bootstrapAddress || nonce === undefined) {
      setTransaction(null);
      return () => {
        current = false;
      };
    }

    (async () => {
      try {
        const authorization = await signAuthorization({
          privateKey: deployer.privateKey,
          chainId: 0,
          address: bootstrapAddress,
          nonce,
        });

        if (current) {
          setTransaction({
            to: bootstrapAddress,
            data: encodeFunctionData({
              abi: bootstrap.abi,
              functionName: "deploy",
            }),
            authorizationList: [authorization],
          });
        }
      } catch {
        // Signing only fails on malformed inputs; leave the step disabled
        // rather than surfacing an unhandled promise rejection.
        if (current) {
          setTransaction(null);
        }
      }
    })();

    return () => {
      current = false;
    };
  }, [bootstrapAddress, nonce]);

  return transaction;
}

export { useDeployFactoryTransaction };
