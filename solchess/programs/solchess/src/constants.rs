// ─── PDA Seeds ────────────────────────────────────────────────────────────────
pub const SEED_GAME:     &[u8] = b"game";
pub const SEED_STAKES:   &[u8] = b"stakes";
pub const SEED_POSITION: &[u8] = b"position";
pub const SEED_STATS:    &[u8] = b"stats";
pub const SEED_VAULT:    &[u8] = b"vault";
pub const SEED_PLATFORM: &[u8] = b"platform";

// ─── Platform Fees (basis points, 1 bp = 0.01%) ──────────────────────────────
/// 3% fee taken from total vault on a decisive result (win/loss)
pub const FEE_WIN_BPS: u64 = 300;
/// 3% fee taken from total vault on a draw
pub const FEE_DRAW_BPS: u64 = 300;
/// 5% fee taken from spectator staking NET profit on a win
pub const STAKE_FEE_WIN_BPS: u64 = 500;
/// 1% fee taken from gross spectator stakes on a draw (consolation)
pub const STAKE_FEE_DRAW_BPS: u64 = 100;

pub const BPS_DENOMINATOR: u64 = 10_000;

// ─── Limits ───────────────────────────────────────────────────────────────────
/// Minimum wager a player can lock into escrow (in lamports = 0.01 SOL)
pub const MIN_WAGER_LAMPORTS: u64 = 10_000_000;
/// Minimum spectator stake (in lamports = 0.001 SOL)
pub const MIN_STAKE_LAMPORTS: u64 = 1_000_000;
/// How long (seconds) before an unjoined game can be abandoned and refunded
pub const ABANDON_TIMEOUT_SECS: i64 = 86_400; // 24 hours