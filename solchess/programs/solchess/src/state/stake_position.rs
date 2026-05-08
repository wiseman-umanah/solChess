use anchor_lang::prelude::*;

/// Which side a spectator staked on
#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum StakeSide {
    White,
    Black,
    Draw,
}

#[account]
pub struct StakePosition {
    /// The staker's wallet
    pub user: Pubkey,

    /// The game this position belongs to
    pub game_id: [u8; 32],

    /// Which outcome they staked on
    pub side: StakeSide,

    /// Amount staked (lamports)
    pub amount: u64,

    /// Whether this position has been claimed already (prevents double-claim)
    pub claimed: bool,

    /// Bump for this PDA
    pub bump: u8,
}

impl StakePosition {
    pub const LEN: usize = 8   // discriminator
        + 32                    // user
        + 32                    // game_id
        + 1                     // side (enum tag)
        + 8                     // amount
        + 1                     // claimed
        + 1;                    // bump
}