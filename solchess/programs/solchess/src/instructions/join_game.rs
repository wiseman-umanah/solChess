use anchor_lang::prelude::*;
use anchor_lang::system_program;
use crate::constants::*;
use crate::errors::SolChessError;
use crate::state::{GameEscrow, GameStatus};

#[derive(Accounts)]
#[instruction(game_id: [u8; 32])]
pub struct JoinGame<'info> {
    /// The joining player — signs and pays the matching wager.
    /// They fill whichever colour slot the creator left empty.
    #[account(mut)]
    pub joiner: Signer<'info>,

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

pub(crate) fn handler(ctx: Context<JoinGame>, _game_id: [u8; 32], joiner_wager: u64) -> Result<()> {
    require!(joiner_wager >= MIN_WAGER_LAMPORTS, SolChessError::WagerTooSmall);

    let escrow = &mut ctx.accounts.game_escrow;
    let joiner = ctx.accounts.joiner.key();

    require!(escrow.status == GameStatus::Open, SolChessError::InvalidGameStatus);

    // Work out which slot is empty and which holds the creator
    let white_empty = escrow.white == Pubkey::default();
    let creator     = if white_empty { escrow.black } else { escrow.white };

    // Prevent self-match: joiner cannot be the same wallet as the creator
    require!(joiner != creator, SolChessError::SelfMatchNotAllowed);

    // Fill the empty colour slot and record this player's wager
    if white_empty {
        escrow.white       = joiner;
        escrow.wager_white = joiner_wager;
    } else {
        escrow.black       = joiner;
        escrow.wager_black = joiner_wager;
    }

    escrow.status = GameStatus::Active;

    system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.joiner.to_account_info(),
                to:   ctx.accounts.vault.to_account_info(),
            },
        ),
        joiner_wager,
    )?;

    Ok(())
}