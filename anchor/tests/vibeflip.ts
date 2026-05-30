import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import { Vibeflip } from "../target/types/vibeflip";
import { PublicKey, LAMPORTS_PER_SOL, SystemProgram } from "@solana/web3.js";
import { assert } from "chai";

describe("vibeflip", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Vibeflip as Program<Vibeflip>;
  const player = provider.wallet as anchor.Wallet;
  const connection = provider.connection;

  let vaultPda: PublicKey;
  let playerPda: PublicKey;

  before(async () => {
    [vaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault")],
      program.programId
    );
    [playerPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("player"), player.publicKey.toBuffer()],
      program.programId
    );

    // Seed the vault bankroll so winning bets can be withdrawn.
    await provider.sendAndConfirm(
      new anchor.web3.Transaction().add(
        SystemProgram.transfer({
          fromPubkey: player.publicKey,
          toPubkey: vaultPda,
          lamports: 2 * LAMPORTS_PER_SOL,
        })
      )
    );
  });

  it("deposits SOL into the casino balance (creating the ledger)", async () => {
    await program.methods
      .deposit(new BN(LAMPORTS_PER_SOL))
      .accountsPartial({
        player: player.publicKey,
        vault: vaultPda,
        playerState: playerPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const ps = await program.account.playerState.fetch(playerPda);
    assert.equal(ps.balance.toNumber(), LAMPORTS_PER_SOL);
    assert.equal(ps.player.toBase58(), player.publicKey.toBase58());
  });

  it("places a bet and settles atomically with 2% edge", async () => {
    const before = (await program.account.playerState.fetch(playerPda)).balance.toNumber();
    const wager = 0.1 * LAMPORTS_PER_SOL;

    let listener: number;
    const eventPromise = new Promise<any>((resolve) => {
      listener = program.addEventListener("flipResult", (ev) => resolve(ev));
    });

    await program.methods
      .placeBet(0, new BN(wager), new BN(123_456))
      .accountsPartial({
        player: player.publicKey,
        playerState: playerPda,
      })
      .rpc();

    const ev = await eventPromise;
    await program.removeEventListener(listener!);

    assert.equal(ev.amount.toNumber(), wager);
    assert.oneOf(ev.outcome, [0, 1]);

    const after = (await program.account.playerState.fetch(playerPda)).balance.toNumber();
    if (ev.won) {
      // net_win = amount * (2*(1-edge) - 1) = wager * 0.96
      assert.equal(after, before + 0.96 * wager);
      assert.equal(ev.netWin.toNumber(), 0.96 * wager);
    } else {
      assert.equal(after, before - wager);
    }
  });

  it("rejects a bet above the ledger balance", async () => {
    try {
      await program.methods
        .placeBet(0, new BN(1_000 * LAMPORTS_PER_SOL), new BN(1))
        .accountsPartial({
          player: player.publicKey,
          playerState: playerPda,
        })
        .rpc();
      assert.fail("expected InsufficientBalance");
    } catch (e) {
      assert.include(e.toString(), "InsufficientBalance");
    }
  });

  it("withdraws SOL back to the wallet", async () => {
    const psBefore = (await program.account.playerState.fetch(playerPda)).balance.toNumber();
    const amount = 0.5 * LAMPORTS_PER_SOL;

    await program.methods
      .withdraw(new BN(amount))
      .accountsPartial({
        player: player.publicKey,
        vault: vaultPda,
        playerState: playerPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const psAfter = (await program.account.playerState.fetch(playerPda)).balance.toNumber();
    assert.equal(psAfter, psBefore - amount);
  });

  it("rejects a withdrawal above the ledger balance", async () => {
    try {
      await program.methods
        .withdraw(new BN(10_000 * LAMPORTS_PER_SOL))
        .accountsPartial({
          player: player.publicKey,
          vault: vaultPda,
          playerState: playerPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      assert.fail("expected InsufficientBalance");
    } catch (e) {
      assert.include(e.toString(), "InsufficientBalance");
    }
  });
});
