use anchor_lang::prelude::*;
use anchor_lang::system_program;
use crate::constants::*;
use crate::errors::SolChessError;
use crate::state::{GameEscrow, GameStatus};

#[derive(Accounts)]
#[instruction(game_id: [u8; 32])]
pub struct ClaimAbandoned<'info> {
    /// Must be the white player (creator)
    #[account(mut, address = game_escrow.white @ SolChessError::NotAPlayer)]
    pub white: Signer<'info>,

    #[account(
        mut,
        seeds = [SEED_GAME, &game_id],
        bump = game_escrow.bump,
    )]
    pub game_escrow: Account<'info, GameEscrow>,

    #[account(
        mut,
        seeds = [SEED_VAULT, &game_id],
        bump = game_escrow.vault_bump,
    )]
    pub vault: SystemAccount<'info>,

    pub system_program: Program<'info, System>,
}

pub(crate) fn handler(ctx: Context<ClaimAbandoned>, game_id: [u8; 32]) -> Result<()> {
    let escrow = &mut ctx.accounts.game_escrow;

    require!(escrow.status == GameStatus::Open, SolChessError::InvalidGameStatus);

    let now = Clock::get()?.unix_timestamp;
    require!(
        now >= escrow.created_at + ABANDON_TIMEOUT_SECS,
        SolChessError::AbandonTooEarly,
    );

    let seeds: &[&[&[u8]]] = &[&[
        SEED_VAULT,
        &game_id,
        &[escrow.vault_bump],
    ]];

    // Refund the creator's wager in full (no opponent, no fee)
    system_program::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.vault.to_account_info(),
                to:   ctx.accounts.white.to_account_info(),
            },
            seeds,
        ),
        escrow.wager_white,
    )?;

    escrow.status = GameStatus::Abandoned;

    Ok(())
}