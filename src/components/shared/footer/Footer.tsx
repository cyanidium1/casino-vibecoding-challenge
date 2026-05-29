import Container from "@/components/shared/container/Container";
import StatusBadge from "@/components/shared/StatusBadge";
import { GithubIcon, ArrowUpRight } from "@/components/shared/icons";
import { CASINO } from "@/lib/config";

const LINKS = [
  { label: "GitHub", href: "https://github.com", icon: <GithubIcon className="h-4 w-4" /> },
  { label: "Live Demo", href: "#top", icon: <ArrowUpRight className="h-4 w-4" /> },
  { label: "Fairness", href: "#fairness", icon: <ArrowUpRight className="h-4 w-4" /> },
];

export default function Footer() {
  return (
    <footer className="relative z-[2] border-t border-white/8 py-14">
      <Container>
        <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[linear-gradient(135deg,#0899FC,#FF49B8)] font-display text-[18px] font-extrabold text-white shadow-[0_8px_24px_-6px_rgba(248,4,152,0.7)]">
                V
              </div>
              <span className="font-display text-[18px] font-bold uppercase tracking-tight">
                {CASINO.name}
                <span className="text-main-light">Casino</span>
              </span>
            </div>
            <p className="mt-4 text-[13px] leading-relaxed text-white/45">
              A provably-fair coin flip casino built for the Vibe-Code Challenge.
              Running on {CASINO.network} — testnet only, with no real money
              involved.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <StatusBadge tone="main">{CASINO.network}</StatusBadge>
              <StatusBadge tone="neutral" dot={false}>
                Testnet Only
              </StatusBadge>
            </div>
          </div>

          <div className="flex gap-12">
            <nav className="flex flex-col gap-3">
              <span className="vf-mono text-[10px] uppercase tracking-[0.16em] text-white/35">
                Links
              </span>
              {LINKS.map((l) => (
                <a
                  key={l.label}
                  href={l.href}
                  target={l.href.startsWith("http") ? "_blank" : undefined}
                  rel={l.href.startsWith("http") ? "noopener noreferrer" : undefined}
                  className="group inline-flex items-center gap-2 text-[14px] text-white/65 transition-colors hover:text-white"
                >
                  <span className="text-white/40 transition-colors group-hover:text-main-light">
                    {l.icon}
                  </span>
                  {l.label}
                </a>
              ))}
            </nav>

            <div className="flex flex-col gap-3">
              <span className="vf-mono text-[10px] uppercase tracking-[0.16em] text-white/35">
                Built for
              </span>
              <span className="text-[14px] text-white/65">Vibe-Code Challenge</span>
              <span className="text-[14px] text-white/65">48-hour build</span>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-white/8 pt-6 text-[12px] text-white/35 sm:flex-row sm:items-center sm:justify-between">
          <span className="vf-mono">
            © {new Date().getFullYear()} {CASINO.name} Casino — Demo build
          </span>
          <span>Not affiliated with Solana. No real funds at risk.</span>
        </div>
      </Container>
    </footer>
  );
}
