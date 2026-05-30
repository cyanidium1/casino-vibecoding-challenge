use anchor_lang::prelude::*;
use anchor_lang::solana_program::hash::hashv;
use anchor_lang::system_program;

// Replace with your own program id after `anchor keys sync` (it rewrites this
// line and Anchor.toml to match target/deploy/vibeflip-keypair.json).
declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

const BPS_DENOMINATOR: u64 = 10_000;
/// House edge in basis points (200 = 2%). A win nets +0.96·amount, loss −amount.
const EDGE_BPS: u64 = 200;

#[program]
pub mod vibeflip {
    use super::*;

    /// Move `amount` lamports from the player's wallet into the pooled vault PDA
    /// and credit the player's ledger balance. Creates the ledger on first use.
    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        require!(amount > 0, VibeError::ZeroAmount);

        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.player.to_account_info(),
                    to: ctx.accounts.vault.to_account_info(),
                },
            ),
            amount,
        )?;

        let player = &mut ctx.accounts.player_state;
        if player.player == Pubkey::default() {
            player.player = ctx.accounts.player.key();
            player.bump = ctx.bumps.player_state;
        }
        player.balance = player.balance.checked_add(amount).ok_or(VibeError::MathOverflow)?;
        Ok(())
    }

    /// Move `amount` lamports from the pooled vault PDA back to the player's
    /// wallet and debit the player's ledger balance. The vault PDA signs.
    pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
        require!(amount > 0, VibeError::ZeroAmount);
        require!(
            ctx.accounts.player_state.balance >= amount,
            VibeError::InsufficientBalance
        );

        let bump = ctx.bumps.vault;
        let signer_seeds: &[&[&[u8]]] = &[&[b"vault", &[bump]]];

        system_program::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.vault.to_account_info(),
                    to: ctx.accounts.player.to_account_info(),
                },
                signer_seeds,
            ),
            amount,
        )?;

        let player = &mut ctx.accounts.player_state;
        player.balance = player.balance.checked_sub(amount).ok_or(VibeError::MathOverflow)?;
        Ok(())
    }

    /// Settle one coin flip atomically against the player's ledger balance.
    ///
    /// `side`: 0 = heads, 1 = tails. `client_seed` is mixed into the outcome so
    /// the player contributes entropy.
    ///
    /// NOTE: the randomness here (slot/clock-derived hash) is **demo-grade and
    /// validator-manipulable** — acceptable only on Devnet with valueless SOL.
    /// Swap in a VRF (ORAO / Switchboard) for production.
    pub fn place_bet(
        ctx: Context<PlaceBet>,
        side: u8,
        amount: u64,
        client_seed: u64,
    ) -> Result<()> {
        require!(side <= 1, VibeError::InvalidSide);
        require!(amount > 0, VibeError::ZeroAmount);

        let player = &mut ctx.accounts.player_state;
        require!(player.balance >= amount, VibeError::InsufficientBalance);

        // payout_total = amount * 2 * (1 - edge); net_win = payout_total - amount.
        let payout_total = (amount as u128)
            .checked_mul(2)
            .and_then(|v| v.checked_mul((BPS_DENOMINATOR - EDGE_BPS) as u128))
            .and_then(|v| v.checked_div(BPS_DENOMINATOR as u128))
            .ok_or(VibeError::MathOverflow)? as u64;
        let net_win = payout_total.checked_sub(amount).ok_or(VibeError::MathOverflow)?;

        // Derive the outcome. Deterministic given the inputs; revealed via event.
        let clock = Clock::get()?;
        let nonce = player.bet_count;
        let outcome = derive_outcome(
            clock.slot,
            clock.unix_timestamp,
            &player.player,
            nonce,
            client_seed,
        );
        let won = outcome == side;

        if won {
            player.balance = player.balance.checked_add(net_win).ok_or(VibeError::MathOverflow)?;
        } else {
            player.balance = player.balance.checked_sub(amount).ok_or(VibeError::MathOverflow)?;
        }

        player.bet_count = player.bet_count.checked_add(1).ok_or(VibeError::MathOverflow)?;
        player.total_wagered = player
            .total_wagered
            .checked_add(amount)
            .ok_or(VibeError::MathOverflow)?;
        player.last_result = outcome;

        emit!(FlipResult {
            player: player.player,
            nonce,
            side,
            outcome,
            won,
            amount,
            net_win,
            new_balance: player.balance,
            client_seed,
            slot: clock.slot,
        });
        Ok(())
    }
}

/// Outcome in {0,1} from a SHA-256 of the entropy inputs, taken mod 2.
fn derive_outcome(
    slot: u64,
    unix_timestamp: i64,
    player: &Pubkey,
    nonce: u64,
    client_seed: u64,
) -> u8 {
    let hash = hashv(&[
        &slot.to_le_bytes(),
        &unix_timestamp.to_le_bytes(),
        player.as_ref(),
        &nonce.to_le_bytes(),
        &client_seed.to_le_bytes(),
    ]);
    hash.to_bytes()[0] & 1
}

/* -------------------------------------------------------------------------- */
/*                                  Accounts                                  */
/* -------------------------------------------------------------------------- */

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(mut)]
    pub player: Signer<'info>,

    /// Pooled lamport bankroll. System-owned PDA; pre-funded by the authority.
    #[account(mut, seeds = [b"vault"], bump)]
    pub vault: SystemAccount<'info>,

    #[account(
        init_if_needed,
        payer = player,
        space = PlayerState::SPACE,
        seeds = [b"player", player.key().as_ref()],
        bump
    )]
    pub player_state: Account<'info, PlayerState>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut)]
    pub player: Signer<'info>,

    #[account(mut, seeds = [b"vault"], bump)]
    pub vault: SystemAccount<'info>,

    #[account(
        mut,
        seeds = [b"player", player.key().as_ref()],
        bump = player_state.bump,
        constraint = player_state.player == player.key() @ VibeError::WrongPlayer
    )]
    pub player_state: Account<'info, PlayerState>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct PlaceBet<'info> {
    pub player: Signer<'info>,

    #[account(
        mut,
        seeds = [b"player", player.key().as_ref()],
        bump = player_state.bump,
        constraint = player_state.player == player.key() @ VibeError::WrongPlayer
    )]
    pub player_state: Account<'info, PlayerState>,
}

/* -------------------------------------------------------------------------- */
/*                                   State                                    */
/* -------------------------------------------------------------------------- */

#[account]
pub struct PlayerState {
    pub player: Pubkey,
    pub balance: u64,
    pub bet_count: u64,
    pub total_wagered: u64,
    pub last_result: u8,
    pub bump: u8,
}

impl PlayerState {
    // 8 discriminator + 32 pubkey + 8*3 u64 + 1 + 1
    pub const SPACE: usize = 8 + 32 + 24 + 1 + 1;
}

/* -------------------------------------------------------------------------- */
/*                                  Events                                    */
/* -------------------------------------------------------------------------- */

#[event]
pub struct FlipResult {
    pub player: Pubkey,
    pub nonce: u64,
    pub side: u8,
    pub outcome: u8,
    pub won: bool,
    pub amount: u64,
    pub net_win: u64,
    pub new_balance: u64,
    pub client_seed: u64,
    pub slot: u64,
}

/* -------------------------------------------------------------------------- */
/*                                  Errors                                    */
/* -------------------------------------------------------------------------- */

#[error_code]
pub enum VibeError {
    #[msg("Amount must be greater than zero")]
    ZeroAmount,
    #[msg("Insufficient casino balance")]
    InsufficientBalance,
    #[msg("side must be 0 (heads) or 1 (tails)")]
    InvalidSide,
    #[msg("Player account / owner mismatch")]
    WrongPlayer,
    #[msg("Arithmetic overflow")]
    MathOverflow,
}
