use anchor_lang::prelude::*;
use anchor_lang::system_program;
use crate::constants::*;
use crate::errors::SolChessError;
use crate::state::{GameEscrow, GameStatus, GameResult, PlatformConfig};

#[derive(Accounts)]
#[instruction(game_id: [u8; 32])]
pub struct CreateGame<'info> {
    /// The game creator — signs and pays wager + rent.
    /// They can be assigned as white or black depending on creator_is_white.
    #[account(mut)]
    pub creator: Signer<'info>,

    #[account(
        init,
        payer = creator,
        space = GameEscrow::LEN,
        seeds = [SEED_GAME, &game_id],
        bump,
    )]
    pub game_escrow: Account<'info, GameEscrow>,

    #[account(
        mut,
        seeds = [SEED_VAULT, &game_id],
        bump,
    )]
    pub vault: SystemAccount<'info>,

    /// Global platform config — authority and treasury read from here
    #[account(seeds = [SEED_PLATFORM], bump = platform_config.bump)]
    pub platform_config: Account<'info, PlatformConfig>,

    pub system_program: Program<'info, System>,
}

pub(crate) fn handler(
    ctx: Context<CreateGame>,
    game_id: [u8; 32],
    wager: u64,
    creator_is_white: bool,
) -> Result<()> {
    require!(wager >= MIN_WAGER_LAMPORTS, SolChessError::WagerTooSmall);

    let creator = ctx.accounts.creator.key();
    let escrow  = &mut ctx.accounts.game_escrow;

    escrow.game_id    = game_id;
    // Assign creator to the correct colour slot; the other stays empty
    escrow.white      = if creator_is_white { creator } else { Pubkey::default() };
    escrow.black      = if creator_is_white { Pubkey::default() } else { creator };
    escrow.wager      = wager;
    escrow.vault      = ctx.accounts.vault.key();
    escrow.vault_bump = ctx.bumps.vault;
    escrow.status     = GameStatus::Open;
    escrow.result     = GameResult::None;
    escrow.authority  = ctx.accounts.platform_config.authority;
    escrow.created_at = Clock::get()?.unix_timestamp;
    escrow.settled_at = 0;
    escrow.bump       = ctx.bumps.game_escrow;

    system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.creator.to_account_info(),
                to:   ctx.accounts.vault.to_account_info(),
            },
        ),
        wager,
    )?;

    Ok(())
}