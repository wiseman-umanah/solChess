use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum GameStatus {
    /// Created by white, waiting for black to join
    Open,
    /// Both players joined, game is live
    Active,
    /// Result confirmed, vault paid out
    Settled,
    /// Timed out before opponent joined — white reclaimed wager
    Abandoned,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum GameResult {
    None,
    White,
    Black,
    Draw,
}

#[account]
pub struct GameEscrow {
    /// The backend-generated game ID (32-byte UUID stored as bytes)
    pub game_id: [u8; 32],

    /// White player's wallet
    pub white: Pubkey,

    /// Black player's wallet (zero pubkey until someone joins)
    pub black: Pubkey,

    /// Wager each player locked in (lamports) — must be equal for both
    pub wager: u64,

    /// PDA vault that holds the locked SOL
    pub vault: Pubkey,

    /// Vault bump for signing CPIs
    pub vault_bump: u8,

    /// Current game lifecycle status
    pub status: GameStatus,

    /// Final result — only set during settle_game
    pub result: GameResult,

    /// Backend authority that is allowed to call settle_game
    pub authority: Pubkey,

    /// Unix timestamp of game creation
    pub created_at: i64,

    /// Unix timestamp of settlement (0 until settled)
    pub settled_at: i64,

    /// Bump for this PDA
    pub bump: u8,
}

impl GameEscrow {
    /// Total space needed for this account
    pub const LEN: usize = 8        // discriminator
        + 32                         // game_id
        + 32                         // white
        + 32                         // black
        + 8                          // wager
        + 32                         // vault
        + 1                          // vault_bump
        + 1                          // status (enum tag)
        + 1                          // result (enum tag)
        + 32                         // authority
        + 8                          // created_at
        + 8                          // settled_at
        + 1;                         // bump
}