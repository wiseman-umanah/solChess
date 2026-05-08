use anchor_lang::prelude::*;
use crate::constants::*;
use crate::errors::SolChessError;
use crate::state::{GameEscrow, GameStatus, GameResult, StakePool};

#[derive(Accounts)]
#[instruction(game_id: [u8; 32])]
pub struct SettleStakes<'info> {
    #[account(mut, address = game_escrow.authority @ SolChessError::UnauthorizedSettle)]
    pub authority: Signer<'info>,

    /// Game must already be settled before stakes can be settled
    #[account(
        seeds = [SEED_GAME, &game_id],
        bump = game_escrow.bump,
        constraint = game_escrow.status == GameStatus::Settled @ SolChessError::InvalidGameStatus,
    )]
    pub game_escrow: Account<'info, GameEscrow>,

    #[account(
        mut,
        seeds = [SEED_STAKES, &game_id],
        bump = stake_pool.bump,
        constraint = !stake_pool.settled @ SolChessError::StakesAlreadySettled,
    )]
    pub stake_pool: Account<'info, StakePool>,
}

pub(crate) fn handler(ctx: Context<SettleStakes>, _game_id: [u8; 32]) -> Result<()> {
    let pool   = &mut ctx.accounts.stake_pool;
    let escrow = &ctx.accounts.game_escrow;

    require!(escrow.result != GameResult::None, SolChessError::InvalidGameStatus);

    pool.settled  = true;
    pool.result   = escrow.result.clone();

    Ok(())
}