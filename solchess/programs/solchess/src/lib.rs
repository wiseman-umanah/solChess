use anchor_lang::prelude::*;

pub mod constants;
pub mod errors;
pub mod state;
pub mod instructions;

pub use instructions::init_platform::*;
pub use instructions::create_game::*;
pub use instructions::join_game::*;
pub use instructions::settle_game::*;
pub use instructions::claim_abandoned::*;
pub use instructions::open_stakes::*;
pub use instructions::place_stake::*;
pub use instructions::settle_stakes::*;
pub use instructions::claim_stake_winnings::*;
pub use instructions::sweep_stake_vault::*;

use state::game_escrow::GameResult;
use state::stake_position::StakeSide;

declare_id!("HCVLAPtDATPRCsGAHbFJKBmahQsjLK9QehXLna12c7NT");

#[program]
pub mod solchess {
    use super::*;

    // ── Platform Setup (call once after deploy) ───────────────────────────────

    /// Initialise the global platform config — sets the settlement authority
    /// and the treasury wallet.  Can only be called once.
    pub fn init_platform(
        ctx: Context<InitPlatform>,
        authority: Pubkey,
        treasury: Pubkey,
    ) -> Result<()> {
        instructions::init_platform::handler(ctx, authority, treasury)
    }

    // ── Escrow ────────────────────────────────────────────────────────────────

    pub fn create_game(
        ctx: Context<CreateGame>,
        game_id: [u8; 32],
        wager: u64,
        creator_is_white: bool,
    ) -> Result<()> {
        instructions::create_game::handler(ctx, game_id, wager, creator_is_white)
    }

    pub fn join_game(
        ctx: Context<JoinGame>,
        game_id: [u8; 32],
    ) -> Result<()> {
        instructions::join_game::handler(ctx, game_id)
    }

    pub fn settle_game(
        ctx: Context<SettleGame>,
        game_id: [u8; 32],
        result: GameResult,
    ) -> Result<()> {
        instructions::settle_game::handler(ctx, game_id, result)
    }

    pub fn claim_abandoned(
        ctx: Context<ClaimAbandoned>,
        game_id: [u8; 32],
    ) -> Result<()> {
        instructions::claim_abandoned::handler(ctx, game_id)
    }

    // ── Staking ───────────────────────────────────────────────────────────────

    pub fn open_stakes(
        ctx: Context<OpenStakes>,
        game_id: [u8; 32],
        window_seconds: u32,
    ) -> Result<()> {
        instructions::open_stakes::handler(ctx, game_id, window_seconds)
    }

    pub fn place_stake(
        ctx: Context<PlaceStake>,
        game_id: [u8; 32],
        side: StakeSide,
        amount: u64,
    ) -> Result<()> {
        instructions::place_stake::handler(ctx, game_id, side, amount)
    }

    pub fn settle_stakes(
        ctx: Context<SettleStakes>,
        game_id: [u8; 32],
    ) -> Result<()> {
        instructions::settle_stakes::handler(ctx, game_id)
    }

    pub fn claim_stake_winnings(
        ctx: Context<ClaimStakeWinnings>,
        game_id: [u8; 32],
    ) -> Result<()> {
        instructions::claim_stake_winnings::handler(ctx, game_id)
    }

    /// Sweeps vault when nobody staked the winning side — platform takes all.
    /// Blocked if any winning stake exists (those claimants must be paid first).
    pub fn sweep_stake_vault(
        ctx: Context<SweepStakeVault>,
        game_id: [u8; 32],
    ) -> Result<()> {
        instructions::sweep_stake_vault::handler(ctx, game_id)
    }
}