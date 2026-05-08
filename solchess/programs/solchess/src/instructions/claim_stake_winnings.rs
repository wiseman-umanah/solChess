use anchor_lang::prelude::*;
use anchor_lang::system_program;
use crate::constants::*;
use crate::errors::SolChessError;
use crate::state::{GameResult, StakePool, StakePosition, StakeSide, PlayerStats, PlatformConfig};

#[derive(Accounts)]
#[instruction(game_id: [u8; 32])]
pub struct ClaimStakeWinnings<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        seeds = [SEED_STAKES, &game_id],
        bump = stake_pool.bump,
        constraint = stake_pool.settled @ SolChessError::StakesNotOpen,
    )]
    pub stake_pool: Account<'info, StakePool>,

    #[account(
        mut,
        seeds = [SEED_POSITION, user.key().as_ref(), &game_id],
        bump = stake_position.bump,
        constraint = stake_position.user == user.key() @ SolChessError::NotAPlayer,
        constraint = !stake_position.claimed @ SolChessError::AlreadyClaimed,
    )]
    pub stake_position: Account<'info, StakePosition>,

    /// Stake pool vault — PDA signs the payout
    #[account(
        mut,
        seeds = [SEED_VAULT, SEED_STAKES, &game_id],
        bump,
    )]
    pub vault: SystemAccount<'info>,

    /// Global platform config — treasury is read from here
    #[account(seeds = [SEED_PLATFORM], bump = platform_config.bump)]
    pub platform_config: Account<'info, PlatformConfig>,

    /// Treasury — must match platform_config.treasury
    /// CHECK: validated against platform_config.treasury
    #[account(mut, address = platform_config.treasury @ SolChessError::UnauthorizedSettle)]
    pub treasury: UncheckedAccount<'info>,

    /// User's PlayerStats — updated with staking earnings
    #[account(
        init_if_needed,
        payer = user,
        space = PlayerStats::LEN,
        seeds = [SEED_STATS, user.key().as_ref()],
        bump,
    )]
    pub player_stats: Account<'info, PlayerStats>,

    pub system_program: Program<'info, System>,
}

pub(crate) fn handler(ctx: Context<ClaimStakeWinnings>, game_id: [u8; 32]) -> Result<()> {
    let pool = &ctx.accounts.stake_pool;
    let pos  = &mut ctx.accounts.stake_position;

    // Determine if this position is on the winning side
    let winning_side = match pool.result {
        GameResult::White => StakeSide::White,
        GameResult::Black => StakeSide::Black,
        GameResult::Draw  => StakeSide::Draw,
        GameResult::None  => return err!(SolChessError::InvalidGameStatus),
    };
    require!(pos.side == winning_side, SolChessError::DidNotWin);

    let total_winning_pool = match winning_side {
        StakeSide::White => pool.total_white,
        StakeSide::Black => pool.total_black,
        StakeSide::Draw  => pool.total_draw,
    };
    require!(total_winning_pool > 0, SolChessError::DivisionByZero);

    let grand_total = pool.grand_total().ok_or(SolChessError::Overflow)?;

    // ── Fee calculation ───────────────────────────────────────────────────────
    // For a draw: 1% fee on gross stake returned
    // For a win:  5% fee on net PROFIT only
    let (gross_payout, fee) = match pool.result {
        GameResult::Draw => {
            let gross = grand_total
                .checked_mul(pos.amount)
                .ok_or(SolChessError::Overflow)?
                .checked_div(total_winning_pool)
                .ok_or(SolChessError::DivisionByZero)?;
            let f = gross
                .checked_mul(STAKE_FEE_DRAW_BPS)
                .ok_or(SolChessError::Overflow)?
                .checked_div(BPS_DENOMINATOR)
                .ok_or(SolChessError::DivisionByZero)?;
            (gross, f)
        }
        _ => {
            let gross = grand_total
                .checked_mul(pos.amount)
                .ok_or(SolChessError::Overflow)?
                .checked_div(total_winning_pool)
                .ok_or(SolChessError::DivisionByZero)?;
            let profit = gross.saturating_sub(pos.amount);
            let f = profit
                .checked_mul(STAKE_FEE_WIN_BPS)
                .ok_or(SolChessError::Overflow)?
                .checked_div(BPS_DENOMINATOR)
                .ok_or(SolChessError::DivisionByZero)?;
            (gross, f)
        }
    };

    let net_payout = gross_payout
        .checked_sub(fee)
        .ok_or(SolChessError::Underflow)?;

    let vault_bump = ctx.bumps.vault;
    let seeds: &[&[&[u8]]] = &[&[
        SEED_VAULT,
        SEED_STAKES,
        &game_id,
        &[vault_bump],
    ]];

    // ── Transfer net payout from vault to user ────────────────────────────────
    system_program::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.vault.to_account_info(),
                to:   ctx.accounts.user.to_account_info(),
            },
            seeds,
        ),
        net_payout,
    )?;

    // ── Transfer fee from vault directly to treasury ──────────────────────────
    if fee > 0 {
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
    }

    // ── Mark position claimed ─────────────────────────────────────────────────
    pos.claimed = true;

    // ── Update PlayerStats ────────────────────────────────────────────────────
    let stats = &mut ctx.accounts.player_stats;
    if stats.player == Pubkey::default() {
        stats.player = ctx.accounts.user.key();
        stats.bump   = ctx.bumps.player_stats;
    }
    let profit = net_payout.saturating_sub(pos.amount);
    stats.staking_earned = stats.staking_earned.saturating_add(profit);

    Ok(())
}