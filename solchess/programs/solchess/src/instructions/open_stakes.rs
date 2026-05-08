use anchor_lang::prelude::*;
use crate::constants::*;
use crate::errors::SolChessError;
use crate::state::{GameEscrow, GameStatus, GameResult, StakePool};

#[derive(Accounts)]
#[instruction(game_id: [u8; 32])]
pub struct OpenStakes<'info> {
    /// Authority that opened the game — same keypair that can settle it
    #[account(mut, address = game_escrow.authority @ SolChessError::UnauthorizedSettle)]
    pub authority: Signer<'info>,

    #[account(
        seeds = [SEED_GAME, &game_id],
        bump = game_escrow.bump,
        constraint = game_escrow.status == GameStatus::Active @ SolChessError::InvalidGameStatus,
    )]
    pub game_escrow: Account<'info, GameEscrow>,

    #[account(
        init,
        payer = authority,
        space = StakePool::LEN,
        seeds = [SEED_STAKES, &game_id],
        bump,
    )]
    pub stake_pool: Account<'info, StakePool>,

    pub system_program: Program<'info, System>,
}

pub(crate) fn handler(ctx: Context<OpenStakes>, game_id: [u8; 32], window_seconds: u32) -> Result<()> {
    let pool = &mut ctx.accounts.stake_pool;
    let now  = Clock::get()?.unix_timestamp;

    pool.game_id     = game_id;
    pool.total_white = 0;
    pool.total_black = 0;
    pool.total_draw  = 0;
    pool.closes_at   = now + window_seconds as i64;
    pool.settled     = false;
    pool.vault_swept = false;
    pool.result      = GameResult::None;
    pool.bump        = ctx.bumps.stake_pool;

    Ok(())
}