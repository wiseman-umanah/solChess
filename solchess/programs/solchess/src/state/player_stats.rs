use anchor_lang::prelude::*;

#[account]
pub struct PlayerStats {
    /// The player this account tracks
    pub player: Pubkey,

    /// Total games played (as white or black)
    pub games_played: u32,

    /// Total games won
    pub games_won: u32,

    /// Total games drawn
    pub games_drawn: u32,

    /// Total SOL wagered across all games (lamports)
    pub total_wagered: u64,

    /// Total SOL received from game settlements (lamports)
    /// Net earnings = total_received - total_wagered
    pub total_received: u64,

    /// Total SOL earned from spectator staking wins (lamports, profit only)
    pub staking_earned: u64,

    /// Bump for this PDA
    pub bump: u8,
}

impl PlayerStats {
    pub const LEN: usize = 8   // discriminator
        + 32                    // player
        + 4                     // games_played
        + 4                     // games_won
        + 4                     // games_drawn
        + 8                     // total_wagered
        + 8                     // total_received
        + 8                     // staking_earned
        + 1;                    // bump

    /// Win rate as a percentage * 100 (e.g. 6250 = 62.50%)
    /// Use integer math — avoid floating point on-chain
    pub fn win_rate_bps(&self) -> u32 {
        if self.games_played == 0 {
            return 0;
        }
        (self.games_won as u64 * 10_000 / self.games_played as u64) as u32
    }
}