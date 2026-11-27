import { createContext, useContext, useMemo, useState } from "react";
import { type Client, createClient, isHash } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { unstable_connector, useAccount } from "wagmi";

const KEY = "burner:private-key";

function getBurnerPrivateKey() {
  const stored = localStorage.getItem(KEY);
  if (stored && isHash(stored)) {
    return stored;
  }

  const privateKey = generatePrivateKey();
  localStorage.setItem(KEY, privateKey);
  return privateKey;
}

const BurnerContext = createContext<Client | undefined>(undefined);

function BurnerProvider({ children }: React.PropsWithChildren) {
  const account = useBurnerAccount();
  const { chain, connector } = useAccount();

  const burner = useMemo(
    () =>
      chain && connector
        ? createClient({
            account,
            chain,
            transport: unstable_connector(connector),
            key: "burner",
            name: "Burner Client",
          })
        : undefined,
    [account, chain, connector],
  );

  return <BurnerContext value={burner}>{children}</BurnerContext>;
}

function useBurnerClient() {
  return useContext(BurnerContext);
}

// Reads the burner key once per mount. Reading it during render would perform
// a localStorage write as a side effect on every render.
function useBurnerKey() {
  const [privateKey] = useState(() => getBurnerPrivateKey());
  const account = useMemo(() => privateKeyToAccount(privateKey), [privateKey]);
  return { account, privateKey };
}

function useBurnerAccount() {
  return useBurnerKey().account;
}

export {
  BurnerProvider,
  getBurnerPrivateKey,
  useBurnerClient,
  useBurnerAccount,
  useBurnerKey,
};
