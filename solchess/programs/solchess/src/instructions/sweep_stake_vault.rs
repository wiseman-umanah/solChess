use anchor_lang::prelude::*;
use anchor_lang::system_program;
use crate::constants::*;
use crate::errors::SolChessError;
use crate::state::{GameResult, StakePool, PlatformConfig};

/// Authority sweeps the remaining stake vault balance to treasury.
///
/// This instruction is ONLY valid when nobody staked the winning side —
/// in that case the entire vault goes to the platform because there are no
/// winning claimants.  If any winning stake exists, those claimants must be
/// paid first; we block the sweep to protect them.
///
/// For ordinary games where winners DO exist, the vault empties naturally
/// as each winner calls claim_stake_winnings.  No sweep is needed.
#[derive(Accounts)]
#[instruction(game_id: [u8; 32])]
pub struct SweepStakeVault<'info> {
    /// Must be the platform authority
    #[account(
        mut,
        address = platform_config.authority @ SolChessError::UnauthorizedSettle,
    )]
    pub authority: Signer<'info>,

    /// Global platform config — authority and treasury are validated here
    #[account(seeds = [SEED_PLATFORM], bump = platform_config.bump)]
    pub platform_config: Account<'info, PlatformConfig>,

    #[account(
        mut,
        seeds = [SEED_STAKES, &game_id],
        bump = stake_pool.bump,
        constraint = stake_pool.settled      @ SolChessError::InvalidGameStatus,
        constraint = !stake_pool.vault_swept @ SolChessError::StakesAlreadySettled,
    )]
    pub stake_pool: Account<'info, StakePool>,

    /// The stake vault PDA holding all remaining SOL
    #[account(
        mut,
        seeds = [SEED_VAULT, SEED_STAKES, &game_id],
        bump,
    )]
    pub vault: SystemAccount<'info>,

    /// Treasury — must match platform_config.treasury
    /// CHECK: validated against platform_config.treasury
    #[account(mut, address = platform_config.treasury @ SolChessError::UnauthorizedSettle)]
    pub treasury: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

pub(crate) fn handler(ctx: Context<SweepStakeVault>, game_id: [u8; 32]) -> Result<()> {
    let pool = &mut ctx.accounts.stake_pool;

    // Guard: only sweep when there are NO winning stakers.
    // If the winning side has any balance, living claimants would be robbed.
    let winning_total = match pool.result {
        GameResult::White => pool.total_white,
        GameResult::Black => pool.total_black,
        GameResult::Draw  => pool.total_draw,
        GameResult::None  => return err!(SolChessError::InvalidGameStatus),
    };
    require!(winning_total == 0, SolChessError::WinnersStillClaimable);

    let vault_lamports = ctx.accounts.vault.lamports();
    require!(vault_lamports > 0, SolChessError::DivisionByZero);

    let vault_bump = ctx.bumps.vault;
    let seeds: &[&[&[u8]]] = &[&[
        SEED_VAULT,
        SEED_STAKES,
        &game_id,
        &[vault_bump],
    ]];

    system_program::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.vault.to_account_info(),
                to:   ctx.accounts.treasury.to_account_info(),
            },
            seeds,
        ),
        vault_lamports,
    )?;

    pool.vault_swept = true;

    Ok(())
}