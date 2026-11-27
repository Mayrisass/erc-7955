import { useQuery } from "@tanstack/react-query";

interface Chain {
  name: string;
  chain: string;
  icon?: string;
  rpc: {
    url: string;
  }[];
  chainId: number;
}

function useChainList() {
  return useQuery({
    queryKey: ["chainlist"],
    queryFn: async () => {
      const response = await fetch("https://chainlist.org/rpcs.json");
      const chains: Chain[] = await response.json();
      chains.sort((a, b) => a.chainId - b.chainId);
      // ChainList can list the same chain ID more than once. Status is tracked
      // per chain ID and rows are keyed by it, so keep only the first entry.
      const seen = new Set<number>();
      return chains.filter(({ chainId }) => {
        if (seen.has(chainId)) {
          return false;
        }
        seen.add(chainId);
        return true;
      });
    },
  });
}

export type { Chain };
export { useChainList };
