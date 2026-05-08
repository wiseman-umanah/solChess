use anchor_lang::prelude::*;
use anchor_lang::system_program;
use crate::constants::*;
use crate::errors::SolChessError;
use crate::state::{GameEscrow, GameStatus, GameResult, PlayerStats, PlatformConfig};

#[derive(Accounts)]
#[instruction(game_id: [u8; 32])]
pub struct SettleGame<'info> {
    /// Must match game_escrow.authority
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [SEED_GAME, &game_id],
        bump = game_escrow.bump,
        has_one = authority @ SolChessError::UnauthorizedSettle,
    )]
    pub game_escrow: Account<'info, GameEscrow>,

    #[account(
        mut,
        seeds = [SEED_VAULT, &game_id],
        bump = game_escrow.vault_bump,
    )]
    pub vault: SystemAccount<'info>,

    /// White player's wallet to receive payout
    /// CHECK: validated against game_escrow.white
    #[account(mut, address = game_escrow.white)]
    pub white_wallet: UncheckedAccount<'info>,

    /// Black player's wallet to receive payout
    /// CHECK: validated against game_escrow.black
    #[account(mut, address = game_escrow.black)]
    pub black_wallet: UncheckedAccount<'info>,

    /// Global platform config — treasury is read from here
    #[account(seeds = [SEED_PLATFORM], bump = platform_config.bump)]
    pub platform_config: Account<'info, PlatformConfig>,

    /// Treasury wallet — must match platform_config.treasury
    /// CHECK: validated against platform_config.treasury
    #[account(mut, address = platform_config.treasury @ SolChessError::UnauthorizedSettle)]
    pub treasury: UncheckedAccount<'info>,

    /// White's PlayerStats PDA — init if it doesn't exist yet
    #[account(
        init_if_needed,
        payer = authority,
        space = PlayerStats::LEN,
        seeds = [SEED_STATS, game_escrow.white.as_ref()],
        bump,
    )]
    pub white_stats: Account<'info, PlayerStats>,

    /// Black's PlayerStats PDA — init if it doesn't exist yet
    #[account(
        init_if_needed,
        payer = authority,
        space = PlayerStats::LEN,
        seeds = [SEED_STATS, game_escrow.black.as_ref()],
        bump,
    )]
    pub black_stats: Account<'info, PlayerStats>,

    pub system_program: Program<'info, System>,
}

pub(crate) fn handler(
    ctx: Context<SettleGame>,
    game_id: [u8; 32],
    result: GameResult,
) -> Result<()> {
    let escrow = &mut ctx.accounts.game_escrow;
    require!(escrow.status == GameStatus::Active, SolChessError::InvalidGameStatus);

    let total_vault = escrow.wager
        .checked_mul(2)
        .ok_or(SolChessError::Overflow)?;

    // ── Platform fee ──────────────────────────────────────────────────────────
    let fee_bps = match result {
        GameResult::Draw => FEE_DRAW_BPS,
        _                => FEE_WIN_BPS,
    };
    let fee = total_vault
        .checked_mul(fee_bps)
        .ok_or(SolChessError::Overflow)?
        .checked_div(BPS_DENOMINATOR)
        .ok_or(SolChessError::DivisionByZero)?;

    let net = total_vault
        .checked_sub(fee)
        .ok_or(SolChessError::Underflow)?;

    // ── PDA signer seeds for vault CPI ────────────────────────────────────────
    let seeds: &[&[&[u8]]] = &[&[
        SEED_VAULT,
        &game_id,
        &[escrow.vault_bump],
    ]];

    // ── Distribute net vault ──────────────────────────────────────────────────
    match result {
        GameResult::White => {
            // Winner takes net pool
            system_program::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.system_program.to_account_info(),
                    system_program::Transfer {
                        from: ctx.accounts.vault.to_account_info(),
                        to:   ctx.accounts.white_wallet.to_account_info(),
                    },
                    seeds,
                ),
                net,
            )?;
        }
        GameResult::Black => {
            system_program::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.system_program.to_account_info(),
                    system_program::Transfer {
                        from: ctx.accounts.vault.to_account_info(),
                        to:   ctx.accounts.black_wallet.to_account_info(),
                    },
                    seeds,
                ),
                net,
            )?;
        }
        GameResult::Draw => {
            // Split net 50/50 back to each player
            let half = net
                .checked_div(2)
                .ok_or(SolChessError::DivisionByZero)?;

            system_program::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.system_program.to_account_info(),
                    system_program::Transfer {
                        from: ctx.accounts.vault.to_account_info(),
                        to:   ctx.accounts.white_wallet.to_account_info(),
                    },
                    seeds,
                ),
                half,
            )?;
            system_program::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.system_program.to_account_info(),
                    system_program::Transfer {
                        from: ctx.accounts.vault.to_account_info(),
                        to:   ctx.accounts.black_wallet.to_account_info(),
                    },
                    seeds,
                ),
                // Give any odd lamport to black (negligible, avoids leftover)
                net - half,
            )?;
        }
        GameResult::None => return err!(SolChessError::InvalidGameStatus),
    }

    // ── Fee to treasury ───────────────────────────────────────────────────────
    system_program::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.vault.to_account_info(),
                to:   ctx.accounts.treasury.to_account_info(),
            },
            seeds,
        ),
        fee,
    )?;

    // ── Update PlayerStats ────────────────────────────────────────────────────
    let ws = &mut ctx.accounts.white_stats;
    let bs = &mut ctx.accounts.black_stats;

    // Initialise if freshly created
    if ws.player == Pubkey::default() {
        ws.player = escrow.white;
        ws.bump   = ctx.bumps.white_stats;
    }
    if bs.player == Pubkey::default() {
        bs.player = escrow.black;
        bs.bump   = ctx.bumps.black_stats;
    }

    ws.games_played = ws.games_played.saturating_add(1);
    bs.games_played = bs.games_played.saturating_add(1);
    ws.total_wagered = ws.total_wagered.saturating_add(escrow.wager);
    bs.total_wagered = bs.total_wagered.saturating_add(escrow.wager);

    match result {
        GameResult::White => {
            ws.games_won     = ws.games_won.saturating_add(1);
            ws.total_received = ws.total_received.saturating_add(net);
            bs.total_received = bs.total_received.saturating_add(0);
        }
        GameResult::Black => {
            bs.games_won     = bs.games_won.saturating_add(1);
            bs.total_received = bs.total_received.saturating_add(net);
            ws.total_received = ws.total_received.saturating_add(0);
        }
        GameResult::Draw => {
            let half = net.checked_div(2).ok_or(SolChessError::DivisionByZero)?;
            ws.games_drawn   = ws.games_drawn.saturating_add(1);
            bs.games_drawn   = bs.games_drawn.saturating_add(1);
            ws.total_received = ws.total_received.saturating_add(half);
            bs.total_received = bs.total_received.saturating_add(net - half);
        }
        GameResult::None => {}
    }

    // ── Finalise escrow ───────────────────────────────────────────────────────
    escrow.status    = GameStatus::Settled;
    escrow.result    = result;
    escrow.settled_at = Clock::get()?.unix_timestamp;

    Ok(())
}