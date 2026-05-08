use anchor_lang::prelude::*;

/// Global platform configuration — initialised once at deploy time.
/// Stores the two privileged addresses so no instruction can spoof them.
#[account]
pub struct PlatformConfig {
    /// Admin wallet — the only key allowed to call init_platform
    pub admin: Pubkey,
    /// Backend authority — settles games, opens / settles stake pools
    pub authority: Pubkey,
    /// Treasury wallet — receives all platform fees
    pub treasury: Pubkey,
    /// PDA bump
    pub bump: u8,
}

impl PlatformConfig {
    pub const LEN: usize = 8  // discriminator
        + 32                   // admin
        + 32                   // authority
        + 32                   // treasury
        + 1;                   // bump
}