use anchor_lang::prelude::*;
use crate::constants::*;
use crate::state::PlatformConfig;

#[derive(Accounts)]
pub struct InitPlatform<'info> {
    /// The wallet calling this — becomes the admin.
    /// Can only be called once (init will fail if the PDA already exists).
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        init,
        payer = admin,
        space = PlatformConfig::LEN,
        seeds = [SEED_PLATFORM],
        bump,
    )]
    pub platform_config: Account<'info, PlatformConfig>,

    pub system_program: Program<'info, System>,
}

pub(crate) fn handler(
    ctx: Context<InitPlatform>,
    authority: Pubkey,
    treasury: Pubkey,
) -> Result<()> {
    let cfg = &mut ctx.accounts.platform_config;
    cfg.admin     = ctx.accounts.admin.key();
    cfg.authority = authority;
    cfg.treasury  = treasury;
    cfg.bump      = ctx.bumps.platform_config;
    Ok(())
}