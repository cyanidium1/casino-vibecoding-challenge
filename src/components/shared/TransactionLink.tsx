import { explorerTx } from "@/lib/config";
import { shortenAddress } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { ArrowUpRight } from "@/components/shared/icons";

interface TransactionLinkProps {
  signature: string;
  label?: string;
  className?: string;
}

/** Links a (mock) signature to the Solana Devnet explorer. */
export default function TransactionLink({
  signature,
  label,
  className,
}: TransactionLinkProps) {
  return (
    <a
      href={explorerTx(signature)}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "vf-mono inline-flex items-center gap-1 text-[12px] text-white/50 transition-colors hover:text-main-light",
        className,
      )}
      title={`View ${signature} on Solana Explorer`}
    >
      {label ?? shortenAddress(signature, 4)}
      <ArrowUpRight className="h-3 w-3" />
    </a>
  );
}
