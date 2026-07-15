import type { Address } from "viem";

const SOURCIFY_BASE = "https://sourcify-api-monad.blockvision.org";

// null = we couldn't determine it (network error, etc.) — never treated as
// "unverified" in the UI, since that would be a false accusation.
export async function checkContractVerified(
  chainId: number,
  address: Address,
): Promise<boolean | null> {
  try {
    const res = await fetch(`${SOURCIFY_BASE}/v2/contract/${chainId}/${address}`);
    if (res.status === 404) return false;
    if (!res.ok) return null;
    const json = (await res.json()) as { match?: string | null };
    return json.match === "match" || json.match === "match_partial";
  } catch {
    return null;
  }
}
