import Container from "@/components/shared/container/Container";
import SectionHeading from "@/components/shared/SectionHeading";
import CoinFlipGame from "@/components/home/game/CoinFlipGame";
import WalletPanel from "@/components/home/wallet/WalletPanel";
import BetHistory from "@/components/home/bets/BetHistory";

export default function PlaySection() {
  return (
    <section id="play" className="relative z-[2] py-20 lg:py-24">
      <Container>
        <SectionHeading
          eyebrow="The Game"
          title="Pick a side. Set your stake. Flip."
          description="Heads or tails — a single on-chain flip decides it. Connect your wallet, deposit devnet SOL, and play with a fixed 2% house edge."
        />

        <div className="mt-12 grid items-start gap-6 lg:grid-cols-[1fr_380px]">
          <CoinFlipGame />
          <div className="flex flex-col gap-6">
            <WalletPanel />
          </div>
        </div>

        <div id="history" className="mt-6 scroll-mt-24">
          <BetHistory />
        </div>
      </Container>
    </section>
  );
}
