use anchor_lang::prelude::*;
use crate::state::game_escrow::GameResult;

#[account]
pub struct StakePool {
    /// Links back to the game
    pub game_id: [u8; 32],

    /// Total SOL staked on white (lamports)
    pub total_white: u64,

    /// Total SOL staked on black (lamports)
    pub total_black: u64,

    /// Total SOL staked on draw (lamports)
    pub total_draw: u64,

    /// Unix timestamp after which no new stakes are accepted (0 = not yet opened)
    pub closes_at: i64,

    /// Whether the pool has been settled and payouts are claimable
    pub settled: bool,

    /// Whether the authority has already swept the vault remainder to treasury
    pub vault_swept: bool,

    /// Result copied from GameEscrow at settlement time
    pub result: GameResult,

    /// Bump for this PDA
    pub bump: u8,
}

impl StakePool {
    pub const LEN: usize = 8    // discriminator
        + 32                     // game_id
        + 8                      // total_white
        + 8                      // total_black
        + 8                      // total_draw
        + 8                      // closes_at
        + 1                      // settled
        + 1                      // vault_swept
        + 1                      // result (enum tag)
        + 1;                     // bump

    /// Grand total across all three sides — fails loudly on overflow
    pub fn grand_total(&self) -> Option<u64> {
        self.total_white
            .checked_add(self.total_black)?
            .checked_add(self.total_draw)
    }
}