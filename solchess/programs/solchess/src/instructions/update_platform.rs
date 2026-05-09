use anchor_lang::prelude::*;
use crate::constants::SEED_PLATFORM;
use crate::errors::SolChessError;
use crate::state::PlatformConfig;

#[derive(Accounts)]
pub struct UpdatePlatform<'info> {
    /// Must be the original admin that called init_platform.
    /// Only the admin key stored on-chain can rotate authority or treasury.
    #[account(
        constraint = admin.key() == platform_config.admin @ SolChessError::UnauthorizedAdmin
    )]
    pub admin: Signer<'info>,

    #[account(
        mut,
        seeds = [SEED_PLATFORM],
        bump = platform_config.bump,
    )]
    pub platform_config: Account<'info, PlatformConfig>,
}

/// Update the platform authority and/or treasury.
/// Pass `None` for any field you do not want to change.
pub(crate) fn handler(
    ctx: Context<UpdatePlatform>,
    new_authority: Option<Pubkey>,
    new_treasury: Option<Pubkey>,
) -> Result<()> {
    let cfg = &mut ctx.accounts.platform_config;
    if let Some(a) = new_authority {
        cfg.authority = a;
    }
    if let Some(t) = new_treasury {
        cfg.treasury = t;
    }
    Ok(())
}
