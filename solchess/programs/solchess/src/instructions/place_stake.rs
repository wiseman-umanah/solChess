use anchor_lang::prelude::*;
use anchor_lang::system_program;
use crate::constants::*;
use crate::errors::SolChessError;
use crate::state::{GameEscrow, GameStatus, StakePool, StakePosition, StakeSide};

#[derive(Accounts)]
#[instruction(game_id: [u8; 32], side: StakeSide)]
pub struct PlaceStake<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    /// Read game_escrow to guard against post-result staking and player self-staking.
    /// Players cannot stake on their own game — they have insider information.
    #[account(
        seeds = [SEED_GAME, &game_id],
        bump = game_escrow.bump,
        constraint = game_escrow.status == GameStatus::Active @ SolChessError::InvalidGameStatus,
        constraint = user.key() != game_escrow.white        @ SolChessError::PlayerCannotStake,
        constraint = user.key() != game_escrow.black        @ SolChessError::PlayerCannotStake,
    )]
    pub game_escrow: Account<'info, GameEscrow>,

    #[account(
        mut,
        seeds = [SEED_STAKES, &game_id],
        bump = stake_pool.bump,
        constraint = stake_pool.closes_at > 0 @ SolChessError::StakesNotOpen,
    )]
    pub stake_pool: Account<'info, StakePool>,

    /// One StakePosition per (user, game) — a user can stake once per game
    #[account(
        init,
        payer = user,
        space = StakePosition::LEN,
        seeds = [SEED_POSITION, user.key().as_ref(), &game_id],
        bump,
    )]
    pub stake_position: Account<'info, StakePosition>,

    /// The stake pool's vault
    #[account(
        mut,
        seeds = [SEED_VAULT, SEED_STAKES, &game_id],
        bump,
    )]
    pub vault: SystemAccount<'info>,

    pub system_program: Program<'info, System>,
}

pub(crate) fn handler(
    ctx: Context<PlaceStake>,
    _game_id: [u8; 32],
    side: StakeSide,
    amount: u64,
) -> Result<()> {
    require!(amount >= MIN_STAKE_LAMPORTS, SolChessError::StakeTooSmall);

    let pool = &mut ctx.accounts.stake_pool;
    require!(
        Clock::get()?.unix_timestamp < pool.closes_at,
        SolChessError::StakesAlreadyClosed
    );

    // Record position
    let pos = &mut ctx.accounts.stake_position;
    pos.user    = ctx.accounts.user.key();
    pos.side    = side.clone();
    pos.amount  = amount;
    pos.claimed = false;
    pos.bump    = ctx.bumps.stake_position;

    // Update pool totals — fail loudly on overflow, never silently saturate
    match side {
        StakeSide::White => {
            pool.total_white = pool.total_white
                .checked_add(amount)
                .ok_or(SolChessError::Overflow)?;
        }
        StakeSide::Black => {
            pool.total_black = pool.total_black
                .checked_add(amount)
                .ok_or(SolChessError::Overflow)?;
        }
        StakeSide::Draw => {
            pool.total_draw = pool.total_draw
                .checked_add(amount)
                .ok_or(SolChessError::Overflow)?;
        }
    }

    // Transfer stake into the pool vault
    system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.user.to_account_info(),
                to:   ctx.accounts.vault.to_account_info(),
            },
        ),
        amount,
    )?;

    Ok(())
}