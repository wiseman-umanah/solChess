use anchor_lang::prelude::*;

#[error_code]
pub enum SolChessError {
    // ── Game Escrow ───────────────────────────────────────────────────────────
    #[msg("Game is not in the expected status for this action")]
    InvalidGameStatus,

    #[msg("You are not a participant in this game")]
    NotAPlayer,

    #[msg("Players cannot stake on their own game")]
    PlayerCannotStake,

    #[msg("You cannot join a game you created")]
    SelfMatchNotAllowed,

    #[msg("It is not your turn")]
    NotYourTurn,

    #[msg("Wager amount is below the minimum allowed")]
    WagerTooSmall,

    #[msg("The game has already been joined")]
    GameAlreadyFull,

    #[msg("Game cannot be abandoned yet — timeout has not elapsed")]
    AbandonTooEarly,

    #[msg("Only the game authority can settle this game")]
    UnauthorizedSettle,

    #[msg("Only the platform admin can perform this action")]
    UnauthorizedAdmin,

    // ── Staking ───────────────────────────────────────────────────────────────
    #[msg("Stake amount is below the minimum allowed")]
    StakeTooSmall,

    #[msg("Stakes are not open for this game")]
    StakesNotOpen,

    #[msg("Stakes have already been closed for this game")]
    StakesAlreadyClosed,

    #[msg("Stakes have already been settled")]
    StakesAlreadySettled,

    #[msg("This stake position has already been claimed")]
    AlreadyClaimed,

    #[msg("Cannot sweep vault — winning stakers can still claim their payouts")]
    WinnersStillClaimable,

    #[msg("You did not stake on the winning side")]
    DidNotWin,

    #[msg("Invalid side — must be white, black, or draw")]
    InvalidSide,

    // ── Arithmetic ────────────────────────────────────────────────────────────
    #[msg("Arithmetic overflow")]
    Overflow,

    #[msg("Arithmetic underflow")]
    Underflow,

    #[msg("Division by zero")]
    DivisionByZero,
}