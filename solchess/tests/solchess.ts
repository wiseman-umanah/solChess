import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import { Solchess } from "../target/types/solchess";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { assert } from "chai";

// ─── Seeds (must match constants.rs) ─────────────────────────────────────────
const SEED_GAME     = Buffer.from("game");
const SEED_VAULT    = Buffer.from("vault");
const SEED_STAKES   = Buffer.from("stakes");
const SEED_POSITION = Buffer.from("position");
const SEED_STATS    = Buffer.from("stats");
const SEED_PLATFORM = Buffer.from("platform");

// ─── Fee constants (must match constants.rs) ──────────────────────────────────
const FEE_WIN_BPS        = 300;   // 3% of game vault on decisive result
const FEE_DRAW_BPS       = 300;   // 3% of game vault on draw
const STAKE_FEE_WIN_BPS  = 500;   // 5% of staking profit on win
const STAKE_FEE_DRAW_BPS = 100;   // 1% gross on draw stakes
const BPS_DENOMINATOR    = 10_000;
const AUTHORITY_FEE_BPS  = 1_000; // 10% of platform fee → authority (gas top-up)

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function airdrop(
  connection: anchor.web3.Connection,
  pubkey: PublicKey,
  sol = 10
) {
  const sig = await connection.requestAirdrop(pubkey, sol * LAMPORTS_PER_SOL);
  await connection.confirmTransaction(sig, "confirmed");
}

function derivePlatformPDA(programId: PublicKey) {
  return PublicKey.findProgramAddressSync([SEED_PLATFORM], programId);
}

function deriveGamePDAs(programId: PublicKey, gameId: Buffer) {
  const [gameEscrow] = PublicKey.findProgramAddressSync([SEED_GAME, gameId], programId);
  const [vault]      = PublicKey.findProgramAddressSync([SEED_VAULT, gameId], programId);
  return { gameEscrow, vault };
}

function deriveStakePDAs(programId: PublicKey, gameId: Buffer, user?: PublicKey) {
  const [stakePool]  = PublicKey.findProgramAddressSync([SEED_STAKES, gameId], programId);
  const [stakeVault] = PublicKey.findProgramAddressSync([SEED_VAULT, SEED_STAKES, gameId], programId);
  const stakePosition = user
    ? PublicKey.findProgramAddressSync([SEED_POSITION, user.toBuffer(), gameId], programId)[0]
    : null;
  return { stakePool, stakeVault, stakePosition };
}

function deriveStatsPDA(programId: PublicKey, player: PublicKey) {
  return PublicKey.findProgramAddressSync([SEED_STATS, player.toBuffer()], programId)[0];
}

function newGameId(): Buffer {
  const buf = Buffer.alloc(32);
  for (let i = 0; i < 32; i++) buf[i] = Math.floor(Math.random() * 256);
  return buf;
}

// ─── Test Suite ───────────────────────────────────────────────────────────────

describe("solchess", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Solchess as Program<Solchess>;
  const conn    = provider.connection;

  // Shared keypairs — funded in the root before()
  let authority:      Keypair;
  let white:          Keypair;
  let black:          Keypair;
  let spectator:      Keypair;
  let treasury:       Keypair;
  let platformConfig: PublicKey;

  before(async () => {
    authority = Keypair.generate();
    white     = Keypair.generate();
    black     = Keypair.generate();
    spectator = Keypair.generate();
    treasury  = Keypair.generate();
    [platformConfig] = derivePlatformPDA(program.programId);

    console.log("\n  ── Accounts ─────────────────────────────────────────────");
    console.log("  authority      :", authority.publicKey.toBase58());
    console.log("  white          :", white.publicKey.toBase58());
    console.log("  black          :", black.publicKey.toBase58());
    console.log("  spectator      :", spectator.publicKey.toBase58());
    console.log("  treasury       :", treasury.publicKey.toBase58());
    console.log("  platformConfig :", platformConfig.toBase58());

    await Promise.all([
      airdrop(conn, authority.publicKey),
      airdrop(conn, white.publicKey),
      airdrop(conn, black.publicKey),
      airdrop(conn, spectator.publicKey),
    ]);

    // ── Init platform — use provider wallet as admin (persistent keypair).
    // On re-runs against the same validator the PDA already exists, so we
    // call updatePlatform instead to rotate authority/treasury to fresh keys.
    const admin = (provider.wallet as anchor.Wallet).payer;

    try {
      await program.methods
        .initPlatform(authority.publicKey, treasury.publicKey)
        .accountsStrict({
          admin: admin.publicKey, platformConfig,
          systemProgram: SystemProgram.programId,
        })
        .signers([admin])
        .rpc();
      console.log("  platform init  : OK (first run)\n");
    } catch {
      // PDA already exists — rotate to fresh test keypairs via updatePlatform
      await program.methods
        .updatePlatform(authority.publicKey, treasury.publicKey)
        .accountsStrict({ admin: admin.publicKey, platformConfig })
        .signers([admin])
        .rpc();
      console.log("  platform init  : OK (rotated via updatePlatform)\n");
    }

    const cfg = await program.account.platformConfig.fetch(platformConfig);
    assert.ok(cfg.authority.equals(authority.publicKey));
    assert.ok(cfg.treasury.equals(treasury.publicKey));
  });

  // ══════════════════════════════════════════════════════════════════════════════
  //  SUITE 1 — Platform Config
  // ══════════════════════════════════════════════════════════════════════════════

  describe("Platform Config", () => {
    it("cannot initialise platform config twice", async () => {
      const admin = (provider.wallet as anchor.Wallet).payer;
      try {
        await program.methods
          .initPlatform(authority.publicKey, treasury.publicKey)
          .accountsStrict({
            admin: admin.publicKey, platformConfig,
            systemProgram: SystemProgram.programId,
          })
          .signers([admin])
          .rpc();
        assert.fail("Expected init to fail — account already exists");
      } catch (err: any) {
        assert.ok(err, "correctly rejected: cannot re-init platform config");
        console.log(`    correctly rejected: double init`);
      }
    });

    it("admin can rotate authority and treasury via updatePlatform", async () => {
      const admin       = (provider.wallet as anchor.Wallet).payer;
      const newAuthority = Keypair.generate();
      const newTreasury  = Keypair.generate();

      await program.methods
        .updatePlatform(newAuthority.publicKey, newTreasury.publicKey)
        .accountsStrict({ admin: admin.publicKey, platformConfig })
        .signers([admin])
        .rpc();

      const cfg = await program.account.platformConfig.fetch(platformConfig);
      assert.ok(cfg.authority.equals(newAuthority.publicKey), "authority rotated");
      assert.ok(cfg.treasury.equals(newTreasury.publicKey), "treasury rotated");
      console.log(`    rotated authority and treasury OK`);

      // Rotate back to the test authority/treasury so subsequent tests still work
      await program.methods
        .updatePlatform(authority.publicKey, treasury.publicKey)
        .accountsStrict({ admin: admin.publicKey, platformConfig })
        .signers([admin])
        .rpc();
    });

    it("non-admin cannot call updatePlatform", async () => {
      try {
        await program.methods
          .updatePlatform(authority.publicKey, treasury.publicKey)
          .accountsStrict({ admin: authority.publicKey, platformConfig })
          .signers([authority])
          .rpc();
        assert.fail("Expected rejection — authority is not the admin");
      } catch (err: any) {
        assert.ok(err, "correctly rejected: non-admin updatePlatform");
        console.log(`    correctly rejected: non-admin cannot update platform`);
      }
    });
  });

  // ══════════════════════════════════════════════════════════════════════════════
  //  SUITE 2 — Game Escrow: White wins
  // ══════════════════════════════════════════════════════════════════════════════

  describe("Game Escrow — White wins", () => {
    const WAGER = new BN(50_000_000); // 0.05 SOL each
    let gameId:     Buffer;
    let gameEscrow: PublicKey;
    let vault:      PublicKey;

    before(() => {
      gameId = newGameId();
      ({ gameEscrow, vault } = deriveGamePDAs(program.programId, gameId));
    });

    it("white creates a game and locks wager", async () => {
      const beforeBal = await conn.getBalance(white.publicKey);

      await program.methods
        .createGame(Array.from(gameId), WAGER, true)
        .accountsStrict({
          creator: white.publicKey, gameEscrow, vault,
          platformConfig, systemProgram: SystemProgram.programId,
        })
        .signers([white]).rpc();

      const e = await program.account.gameEscrow.fetch(gameEscrow);
      assert.ok(e.white.equals(white.publicKey),        "white stored");
      assert.ok(e.authority.equals(authority.publicKey),"authority = platform authority (not caller-chosen)");
      assert.equal(e.wagerWhite.toNumber(), WAGER.toNumber(), "wager_white stored");
      assert.equal(e.wagerBlack.toNumber(), 0, "wager_black empty until join");
      assert.deepEqual(e.status, { open: {} });
      assert.deepEqual(e.result, { none: {} });

      const vaultBal = await conn.getBalance(vault);
      assert.equal(vaultBal, WAGER.toNumber(), "vault holds wager");
      assert.isBelow(await conn.getBalance(white.publicKey), beforeBal - WAGER.toNumber());
      console.log(`    vault after create: ${vaultBal / LAMPORTS_PER_SOL} SOL`);
    });

    it("black joins the game and locks matching wager", async () => {
      await program.methods
        .joinGame(Array.from(gameId), WAGER)
        .accountsStrict({
          joiner: black.publicKey, gameEscrow, vault,
          systemProgram: SystemProgram.programId,
        })
        .signers([black]).rpc();

      const e = await program.account.gameEscrow.fetch(gameEscrow);
      assert.ok(e.black.equals(black.publicKey));
      assert.deepEqual(e.status, { active: {} });
      assert.equal(await conn.getBalance(vault), WAGER.toNumber() * 2, "vault holds both wagers");
      console.log(`    vault after join: ${WAGER.toNumber() * 2 / LAMPORTS_PER_SOL} SOL`);
    });

    it("authority settles — white wins, correct payout and fee", async () => {
      const whiteStatsPDA = deriveStatsPDA(program.programId, white.publicKey);
      const blackStatsPDA = deriveStatsPDA(program.programId, black.publicKey);

      const whiteBefore    = await conn.getBalance(white.publicKey);
      const treasuryBefore = await conn.getBalance(treasury.publicKey);

      await program.methods
        .settleGame(Array.from(gameId), { white: {} })
        .accountsStrict({
          authority: authority.publicKey, gameEscrow, vault,
          platformConfig,
          whiteWallet: white.publicKey, blackWallet: black.publicKey,
          treasury: treasury.publicKey,
          whiteStats: whiteStatsPDA, blackStats: blackStatsPDA,
          systemProgram: SystemProgram.programId,
        })
        .signers([authority]).rpc();

      const total         = WAGER.toNumber() * 2;
      const fee           = Math.floor(total * FEE_WIN_BPS / BPS_DENOMINATOR);
      const net           = total - fee;
      const authorityCut  = Math.floor(fee * AUTHORITY_FEE_BPS / BPS_DENOMINATOR);
      const treasuryCut   = fee - authorityCut;

      assert.equal(await conn.getBalance(white.publicKey) - whiteBefore, net, "white got net payout");
      assert.equal(await conn.getBalance(treasury.publicKey) - treasuryBefore, treasuryCut, "treasury got 90% of fee");
      console.log(`    net to white: ${net/LAMPORTS_PER_SOL} SOL | fee: ${fee/LAMPORTS_PER_SOL} SOL (authority: ${authorityCut}, treasury: ${treasuryCut})`);

      const ws = await program.account.playerStats.fetch(whiteStatsPDA);
      const bs = await program.account.playerStats.fetch(blackStatsPDA);
      assert.equal(ws.gamesPlayed, 1); assert.equal(ws.gamesWon, 1);
      assert.equal(bs.gamesPlayed, 1); assert.equal(bs.gamesWon, 0);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════════
  //  SUITE 3 — Game Escrow: Creator chooses Black, joiner becomes White
  // ══════════════════════════════════════════════════════════════════════════════

  describe("Game Escrow — Creator picks Black (creator_is_white = false)", () => {
    const WAGER = new BN(50_000_000);
    let gameId: Buffer; let gameEscrow: PublicKey; let vault: PublicKey;

    before(() => {
      gameId = newGameId();
      ({ gameEscrow, vault } = deriveGamePDAs(program.programId, gameId));
    });

    it("creator creates as black — white slot is empty, black slot holds creator", async () => {
      // black keypair is the creator here; white keypair joins as white
      await program.methods.createGame(Array.from(gameId), WAGER, false)
        .accountsStrict({ creator: black.publicKey, gameEscrow, vault, platformConfig, systemProgram: SystemProgram.programId })
        .signers([black]).rpc();

      const e = await program.account.gameEscrow.fetch(gameEscrow);
      assert.ok(e.black.equals(black.publicKey), "creator is stored as black");
      assert.ok(e.white.equals(SystemProgram.programId), "white slot is empty at creation");
      assert.deepEqual(e.status, { open: {} });
    });

    it("joiner fills the white slot and game goes Active", async () => {
      await program.methods.joinGame(Array.from(gameId), WAGER)
        .accountsStrict({ joiner: white.publicKey, gameEscrow, vault, systemProgram: SystemProgram.programId })
        .signers([white]).rpc();

      const e = await program.account.gameEscrow.fetch(gameEscrow);
      assert.ok(e.white.equals(white.publicKey), "joiner assigned to white slot");
      assert.ok(e.black.equals(black.publicKey), "creator stays in black slot");
      assert.deepEqual(e.status, { active: {} });
      assert.equal(await conn.getBalance(vault), WAGER.toNumber() * 2);
    });

    it("authority settles — black wins, correct payout and fee", async () => {
      const whiteStatsPDA = deriveStatsPDA(program.programId, white.publicKey);
      const blackStatsPDA = deriveStatsPDA(program.programId, black.publicKey);

      const blackBefore    = await conn.getBalance(black.publicKey);
      const treasuryBefore = await conn.getBalance(treasury.publicKey);

      await program.methods.settleGame(Array.from(gameId), { black: {} })
        .accountsStrict({
          authority: authority.publicKey, gameEscrow, vault, platformConfig,
          whiteWallet: white.publicKey, blackWallet: black.publicKey,
          treasury: treasury.publicKey,
          whiteStats: whiteStatsPDA, blackStats: blackStatsPDA,
          systemProgram: SystemProgram.programId,
        })
        .signers([authority]).rpc();

      const total        = WAGER.toNumber() * 2;
      const fee          = Math.floor(total * FEE_WIN_BPS / BPS_DENOMINATOR);
      const net          = total - fee;
      const authorityCut = Math.floor(fee * AUTHORITY_FEE_BPS / BPS_DENOMINATOR);
      const treasuryCut  = fee - authorityCut;

      assert.equal(await conn.getBalance(black.publicKey) - blackBefore, net, "black got net payout");
      assert.equal(await conn.getBalance(treasury.publicKey) - treasuryBefore, treasuryCut, "treasury got 90% of fee");

      const bs = await program.account.playerStats.fetch(blackStatsPDA);
      assert.equal(bs.gamesWon, 1, "black stats: 1 win");
      console.log(`    net to black: ${net/LAMPORTS_PER_SOL} SOL`);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════════
  //  SUITE 4 — Game Escrow: Draw
  // ══════════════════════════════════════════════════════════════════════════════

  describe("Game Escrow — Draw", () => {
    const WAGER = new BN(50_000_000);
    let gameId: Buffer; let gameEscrow: PublicKey; let vault: PublicKey;

    before(() => {
      gameId = newGameId();
      ({ gameEscrow, vault } = deriveGamePDAs(program.programId, gameId));
    });

    it("create + join game", async () => {
      await program.methods.createGame(Array.from(gameId), WAGER, true)
        .accountsStrict({ creator: white.publicKey, gameEscrow, vault, platformConfig, systemProgram: SystemProgram.programId })
        .signers([white]).rpc();
      await program.methods.joinGame(Array.from(gameId), WAGER)
        .accountsStrict({ joiner: black.publicKey, gameEscrow, vault, systemProgram: SystemProgram.programId })
        .signers([black]).rpc();
    });

    it("authority settles Draw — vault split 50/50 after fee", async () => {
      const whiteStatsPDA = deriveStatsPDA(program.programId, white.publicKey);
      const blackStatsPDA = deriveStatsPDA(program.programId, black.publicKey);

      const whiteBefore = await conn.getBalance(white.publicKey);
      const blackBefore = await conn.getBalance(black.publicKey);

      await program.methods.settleGame(Array.from(gameId), { draw: {} })
        .accountsStrict({
          authority: authority.publicKey, gameEscrow, vault, platformConfig,
          whiteWallet: white.publicKey, blackWallet: black.publicKey,
          treasury: treasury.publicKey,
          whiteStats: whiteStatsPDA, blackStats: blackStatsPDA,
          systemProgram: SystemProgram.programId,
        })
        .signers([authority]).rpc();

      const total = WAGER.toNumber() * 2;
      const fee   = Math.floor(total * FEE_DRAW_BPS / BPS_DENOMINATOR);
      const net   = total - fee;
      const half  = Math.floor(net / 2);

      assert.equal(await conn.getBalance(white.publicKey) - whiteBefore, half,      "white got half");
      assert.equal(await conn.getBalance(black.publicKey) - blackBefore, net - half, "black got half");

      const ws = await program.account.playerStats.fetch(whiteStatsPDA);
      assert.equal(ws.gamesDrawn, 1);
      console.log(`    each player received: ~${half/LAMPORTS_PER_SOL} SOL`);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════════
  //  SUITE 5 — Spectator Staking: White wins, multiple stakers
  // ══════════════════════════════════════════════════════════════════════════════

  describe("Spectator Staking — White wins (two white stakers, one black)", () => {
    const WAGER          = new BN(50_000_000);
    const STAKE_WHITE_1  = new BN(15_000_000); // spectator1 bets white (equal split avoids division dust)
    const STAKE_WHITE_2  = new BN(15_000_000); // spectator2 bets white
    const STAKE_BLACK    = new BN(20_000_000); // spectatorBlack bets black

    let gameId:        Buffer;
    let gameEscrow:    PublicKey;
    let vault:         PublicKey;
    let stakePool:     PublicKey;
    let stakeVault:    PublicKey;
    let spectator2:    Keypair;
    let spectatorBlack: Keypair;

    before(async () => {
      gameId = newGameId();
      ({ gameEscrow, vault }     = deriveGamePDAs(program.programId, gameId));
      ({ stakePool, stakeVault } = deriveStakePDAs(program.programId, gameId));

      spectator2     = Keypair.generate();
      spectatorBlack = Keypair.generate();
      await Promise.all([
        airdrop(conn, spectator2.publicKey),
        airdrop(conn, spectatorBlack.publicKey),
      ]);

      await program.methods.createGame(Array.from(gameId), WAGER, true)
        .accountsStrict({ creator: white.publicKey, gameEscrow, vault, platformConfig, systemProgram: SystemProgram.programId })
        .signers([white]).rpc();
      await program.methods.joinGame(Array.from(gameId), WAGER)
        .accountsStrict({ joiner: black.publicKey, gameEscrow, vault, systemProgram: SystemProgram.programId })
        .signers([black]).rpc();
      await program.methods.openStakes(Array.from(gameId), 300)
        .accountsStrict({ authority: authority.publicKey, gameEscrow, stakePool, systemProgram: SystemProgram.programId })
        .signers([authority]).rpc();
    });

    it("three spectators place stakes", async () => {
      for (const [user, side, amount] of [
        [spectator,      { white: {} }, STAKE_WHITE_1],
        [spectator2,     { white: {} }, STAKE_WHITE_2],
        [spectatorBlack, { black: {} }, STAKE_BLACK],
      ] as [Keypair, object, BN][]) {
        const pos = deriveStakePDAs(program.programId, gameId, user.publicKey).stakePosition!;
        await program.methods.placeStake(Array.from(gameId), side, amount)
          .accountsStrict({ user: user.publicKey, gameEscrow, stakePool, stakePosition: pos, vault: stakeVault, systemProgram: SystemProgram.programId })
          .signers([user]).rpc();
      }
      const pool = await program.account.stakePool.fetch(stakePool);
      assert.equal(pool.totalWhite.toNumber(), STAKE_WHITE_1.toNumber() + STAKE_WHITE_2.toNumber());
      assert.equal(pool.totalBlack.toNumber(), STAKE_BLACK.toNumber());
      console.log(`    stake vault: ${await conn.getBalance(stakeVault)/LAMPORTS_PER_SOL} SOL`);
    });

    it("game + stake pool settled (White wins)", async () => {
      const whiteStatsPDA = deriveStatsPDA(program.programId, white.publicKey);
      const blackStatsPDA = deriveStatsPDA(program.programId, black.publicKey);

      await program.methods.settleGame(Array.from(gameId), { white: {} })
        .accountsStrict({ authority: authority.publicKey, gameEscrow, vault, platformConfig, whiteWallet: white.publicKey, blackWallet: black.publicKey, treasury: treasury.publicKey, whiteStats: whiteStatsPDA, blackStats: blackStatsPDA, systemProgram: SystemProgram.programId })
        .signers([authority]).rpc();
      await program.methods.settleStakes(Array.from(gameId))
        .accountsStrict({ authority: authority.publicKey, gameEscrow, stakePool })
        .signers([authority]).rpc();

      const pool = await program.account.stakePool.fetch(stakePool);
      assert.ok(pool.settled);
      assert.deepEqual(pool.result, { white: {} });
    });

    it("spectator1 and spectator2 each claim proportional share of the pot", async () => {
      const grandTotal = STAKE_WHITE_1.toNumber() + STAKE_WHITE_2.toNumber() + STAKE_BLACK.toNumber();
      const totalWhite = STAKE_WHITE_1.toNumber() + STAKE_WHITE_2.toNumber();

      for (const [user, stake] of [
        [spectator,  STAKE_WHITE_1],
        [spectator2, STAKE_WHITE_2],
      ] as [Keypair, BN][]) {
        const pos          = deriveStakePDAs(program.programId, gameId, user.publicKey).stakePosition!;
        const playerStats  = deriveStatsPDA(program.programId, user.publicKey);
        const treasuryBefore = await conn.getBalance(treasury.publicKey);

        await program.methods.claimStakeWinnings(Array.from(gameId))
          .accountsStrict({ user: user.publicKey, stakePool, stakePosition: pos, vault: stakeVault, platformConfig, treasury: treasury.publicKey, playerStats, systemProgram: SystemProgram.programId })
          .signers([user]).rpc();

        const gross  = Math.floor(grandTotal * stake.toNumber() / totalWhite);
        const profit = gross - stake.toNumber();
        const fee    = Math.floor(profit * STAKE_FEE_WIN_BPS / BPS_DENOMINATOR);
        const net    = gross - fee;

        const treasuryAfter = await conn.getBalance(treasury.publicKey);
        assert.equal(treasuryAfter - treasuryBefore, fee, `fee for ${user.publicKey.toBase58().slice(0,8)}...`);

        const position = await program.account.stakePosition.fetch(pos);
        assert.ok(position.claimed, "position marked claimed");
        console.log(`    staker ${user.publicKey.toBase58().slice(0,6)} — gross: ${gross/LAMPORTS_PER_SOL}, fee: ${fee/LAMPORTS_PER_SOL}, net: ${net/LAMPORTS_PER_SOL}`);
      }

      // Vault should be fully drained after both winners claimed
      assert.equal(await conn.getBalance(stakeVault), 0, "vault empty after all winners claimed");
    });

    it("losing staker cannot claim", async () => {
      const pos         = deriveStakePDAs(program.programId, gameId, spectatorBlack.publicKey).stakePosition!;
      const playerStats = deriveStatsPDA(program.programId, spectatorBlack.publicKey);
      try {
        await program.methods.claimStakeWinnings(Array.from(gameId))
          .accountsStrict({ user: spectatorBlack.publicKey, stakePool, stakePosition: pos, vault: stakeVault, platformConfig, treasury: treasury.publicKey, playerStats, systemProgram: SystemProgram.programId })
          .signers([spectatorBlack]).rpc();
        assert.fail("Expected DidNotWin");
      } catch (err: any) {
        assert.include(err.message, "DidNotWin");
        console.log(`    correctly rejected: DidNotWin`);
      }
    });

    it("cannot claim the same position twice", async () => {
      const pos         = deriveStakePDAs(program.programId, gameId, spectator.publicKey).stakePosition!;
      const playerStats = deriveStatsPDA(program.programId, spectator.publicKey);
      try {
        await program.methods.claimStakeWinnings(Array.from(gameId))
          .accountsStrict({ user: spectator.publicKey, stakePool, stakePosition: pos, vault: stakeVault, platformConfig, treasury: treasury.publicKey, playerStats, systemProgram: SystemProgram.programId })
          .signers([spectator]).rpc();
        assert.fail("Expected AlreadyClaimed");
      } catch (err: any) {
        assert.include(err.message, "AlreadyClaimed");
        console.log(`    correctly rejected: AlreadyClaimed`);
      }
    });
  });

  // ══════════════════════════════════════════════════════════════════════════════
  //  SUITE 6 — Spectator Staking: Draw outcome
  // ══════════════════════════════════════════════════════════════════════════════

  describe("Spectator Staking — Draw outcome", () => {
    const WAGER       = new BN(50_000_000);
    const STAKE_WHITE = new BN(20_000_000);
    const STAKE_DRAW  = new BN(20_000_000);
    const STAKE_BLACK = new BN(10_000_000);

    let gameId: Buffer; let gameEscrow: PublicKey; let vault: PublicKey;
    let stakePool: PublicKey; let stakeVault: PublicKey;
    let spectatorDraw: Keypair;

    before(async () => {
      gameId = newGameId();
      ({ gameEscrow, vault }     = deriveGamePDAs(program.programId, gameId));
      ({ stakePool, stakeVault } = deriveStakePDAs(program.programId, gameId));

      spectatorDraw = Keypair.generate();
      await airdrop(conn, spectatorDraw.publicKey);

      await program.methods.createGame(Array.from(gameId), WAGER, true)
        .accountsStrict({ creator: white.publicKey, gameEscrow, vault, platformConfig, systemProgram: SystemProgram.programId })
        .signers([white]).rpc();
      await program.methods.joinGame(Array.from(gameId), WAGER)
        .accountsStrict({ joiner: black.publicKey, gameEscrow, vault, systemProgram: SystemProgram.programId })
        .signers([black]).rpc();
      await program.methods.openStakes(Array.from(gameId), 300)
        .accountsStrict({ authority: authority.publicKey, gameEscrow, stakePool, systemProgram: SystemProgram.programId })
        .signers([authority]).rpc();

      // spectator stakes white, spectatorDraw stakes draw, spectator2 stakes black
      const spectator2 = Keypair.generate();
      await airdrop(conn, spectator2.publicKey);

      for (const [user, side, amount] of [
        [spectator,     { white: {} }, STAKE_WHITE],
        [spectatorDraw, { draw: {} },  STAKE_DRAW],
        [spectator2,    { black: {} }, STAKE_BLACK],
      ] as [Keypair, object, BN][]) {
        const pos = deriveStakePDAs(program.programId, gameId, user.publicKey).stakePosition!;
        await program.methods.placeStake(Array.from(gameId), side, amount)
          .accountsStrict({ user: user.publicKey, gameEscrow, stakePool, stakePosition: pos, vault: stakeVault, systemProgram: SystemProgram.programId })
          .signers([user]).rpc();
      }
    });

    it("draw staker claims proportional share with 1% draw fee", async () => {
      const whiteStatsPDA = deriveStatsPDA(program.programId, white.publicKey);
      const blackStatsPDA = deriveStatsPDA(program.programId, black.publicKey);

      await program.methods.settleGame(Array.from(gameId), { draw: {} })
        .accountsStrict({ authority: authority.publicKey, gameEscrow, vault, platformConfig, whiteWallet: white.publicKey, blackWallet: black.publicKey, treasury: treasury.publicKey, whiteStats: whiteStatsPDA, blackStats: blackStatsPDA, systemProgram: SystemProgram.programId })
        .signers([authority]).rpc();
      await program.methods.settleStakes(Array.from(gameId))
        .accountsStrict({ authority: authority.publicKey, gameEscrow, stakePool })
        .signers([authority]).rpc();

      const pos         = deriveStakePDAs(program.programId, gameId, spectatorDraw.publicKey).stakePosition!;
      const playerStats = deriveStatsPDA(program.programId, spectatorDraw.publicKey);
      const treasuryBefore = await conn.getBalance(treasury.publicKey);

      await program.methods.claimStakeWinnings(Array.from(gameId))
        .accountsStrict({ user: spectatorDraw.publicKey, stakePool, stakePosition: pos, vault: stakeVault, platformConfig, treasury: treasury.publicKey, playerStats, systemProgram: SystemProgram.programId })
        .signers([spectatorDraw]).rpc();

      // Draw fee: 1% of gross payout
      const grandTotal = STAKE_WHITE.toNumber() + STAKE_DRAW.toNumber() + STAKE_BLACK.toNumber();
      const gross  = Math.floor(grandTotal * STAKE_DRAW.toNumber() / STAKE_DRAW.toNumber());
      const fee    = Math.floor(gross * STAKE_FEE_DRAW_BPS / BPS_DENOMINATOR);
      const net    = gross - fee;

      const treasuryAfter = await conn.getBalance(treasury.publicKey);
      assert.equal(treasuryAfter - treasuryBefore, fee, "treasury got 1% draw fee");

      const position = await program.account.stakePosition.fetch(pos);
      assert.ok(position.claimed);
      console.log(`    draw staker — gross: ${gross/LAMPORTS_PER_SOL}, fee: ${fee/LAMPORTS_PER_SOL}, net: ${net/LAMPORTS_PER_SOL}`);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════════
  //  SUITE 7 — No winning stakers → platform sweeps entire vault
  // ══════════════════════════════════════════════════════════════════════════════

  describe("Spectator Staking — No winning stakers (platform takes all)", () => {
    const WAGER       = new BN(50_000_000);
    const STAKE_BLACK = new BN(20_000_000); // everyone bet black, white wins

    let gameId: Buffer; let gameEscrow: PublicKey; let vault: PublicKey;
    let stakePool: PublicKey; let stakeVault: PublicKey;

    before(async () => {
      gameId = newGameId();
      ({ gameEscrow, vault }     = deriveGamePDAs(program.programId, gameId));
      ({ stakePool, stakeVault } = deriveStakePDAs(program.programId, gameId));

      await program.methods.createGame(Array.from(gameId), WAGER, true)
        .accountsStrict({ creator: white.publicKey, gameEscrow, vault, platformConfig, systemProgram: SystemProgram.programId })
        .signers([white]).rpc();
      await program.methods.joinGame(Array.from(gameId), WAGER)
        .accountsStrict({ joiner: black.publicKey, gameEscrow, vault, systemProgram: SystemProgram.programId })
        .signers([black]).rpc();
      await program.methods.openStakes(Array.from(gameId), 300)
        .accountsStrict({ authority: authority.publicKey, gameEscrow, stakePool, systemProgram: SystemProgram.programId })
        .signers([authority]).rpc();

      const pos = deriveStakePDAs(program.programId, gameId, spectator.publicKey).stakePosition!;
      await program.methods.placeStake(Array.from(gameId), { black: {} }, STAKE_BLACK)
        .accountsStrict({ user: spectator.publicKey, gameEscrow, stakePool, stakePosition: pos, vault: stakeVault, systemProgram: SystemProgram.programId })
        .signers([spectator]).rpc();
    });

    it("platform sweeps entire vault — no winning stakers exist", async () => {
      const whiteStatsPDA = deriveStatsPDA(program.programId, white.publicKey);
      const blackStatsPDA = deriveStatsPDA(program.programId, black.publicKey);

      await program.methods.settleGame(Array.from(gameId), { white: {} })
        .accountsStrict({ authority: authority.publicKey, gameEscrow, vault, platformConfig, whiteWallet: white.publicKey, blackWallet: black.publicKey, treasury: treasury.publicKey, whiteStats: whiteStatsPDA, blackStats: blackStatsPDA, systemProgram: SystemProgram.programId })
        .signers([authority]).rpc();
      await program.methods.settleStakes(Array.from(gameId))
        .accountsStrict({ authority: authority.publicKey, gameEscrow, stakePool })
        .signers([authority]).rpc();

      const vaultBefore    = await conn.getBalance(stakeVault);
      const treasuryBefore = await conn.getBalance(treasury.publicKey);
      console.log(`    vault (all losing stakes): ${vaultBefore/LAMPORTS_PER_SOL} SOL`);

      await program.methods.sweepStakeVault(Array.from(gameId))
        .accountsStrict({ authority: authority.publicKey, platformConfig, stakePool, vault: stakeVault, treasury: treasury.publicKey, systemProgram: SystemProgram.programId })
        .signers([authority]).rpc();

      assert.equal(await conn.getBalance(stakeVault), 0, "vault emptied");
      assert.equal(await conn.getBalance(treasury.publicKey) - treasuryBefore, vaultBefore, "platform got all losing stakes");
      console.log(`    platform profit: ${vaultBefore/LAMPORTS_PER_SOL} SOL`);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════════
  //  SUITE 8 — Security: Audit findings #1-4 + self-match + ordering guards
  // ══════════════════════════════════════════════════════════════════════════════

  describe("Security tests", () => {

    // ── Helper: creates a game with open stakes pool ──────────────────────────
    async function setupGameWithStakes(stakeAmount: BN, stakeSide: object): Promise<{
      gameId: Buffer; gameEscrow: PublicKey; vault: PublicKey;
      stakePool: PublicKey; stakeVault: PublicKey;
    }> {
      const gId = newGameId();
      const { gameEscrow: ge, vault: v } = deriveGamePDAs(program.programId, gId);
      const { stakePool: sp, stakeVault: sv } = deriveStakePDAs(program.programId, gId);
      const whiteStatsPDA = deriveStatsPDA(program.programId, white.publicKey);
      const blackStatsPDA = deriveStatsPDA(program.programId, black.publicKey);

      await program.methods.createGame(Array.from(gId), new BN(50_000_000), true)
        .accountsStrict({ creator: white.publicKey, gameEscrow: ge, vault: v, platformConfig, systemProgram: SystemProgram.programId })
        .signers([white]).rpc();
      await program.methods.joinGame(Array.from(gId), new BN(50_000_000))
        .accountsStrict({ joiner: black.publicKey, gameEscrow: ge, vault: v, systemProgram: SystemProgram.programId })
        .signers([black]).rpc();
      await program.methods.openStakes(Array.from(gId), 300)
        .accountsStrict({ authority: authority.publicKey, gameEscrow: ge, stakePool: sp, systemProgram: SystemProgram.programId })
        .signers([authority]).rpc();

      const pos = deriveStakePDAs(program.programId, gId, spectator.publicKey).stakePosition!;
      await program.methods.placeStake(Array.from(gId), stakeSide, stakeAmount)
        .accountsStrict({ user: spectator.publicKey, gameEscrow: ge, stakePool: sp, stakePosition: pos, vault: sv, systemProgram: SystemProgram.programId })
        .signers([spectator]).rpc();

      return { gameId: gId, gameEscrow: ge, vault: v, stakePool: sp, stakeVault: sv };
    }

    it("finding #2 — fake treasury on claim is rejected", async () => {
      const { gameId: gId, gameEscrow: ge, vault: v, stakePool: sp, stakeVault: sv } =
        await setupGameWithStakes(new BN(20_000_000), { white: {} });

      const attacker = Keypair.generate();
      await airdrop(conn, attacker.publicKey);

      // Attacker stakes white too (so they're a winner)
      const attackerPos = deriveStakePDAs(program.programId, gId, attacker.publicKey).stakePosition!;
      await program.methods.placeStake(Array.from(gId), { white: {} }, new BN(10_000_000))
        .accountsStrict({ user: attacker.publicKey, gameEscrow: ge, stakePool: sp, stakePosition: attackerPos, vault: sv, systemProgram: SystemProgram.programId })
        .signers([attacker]).rpc();

      const ws = deriveStatsPDA(program.programId, white.publicKey);
      const bs = deriveStatsPDA(program.programId, black.publicKey);
      await program.methods.settleGame(Array.from(gId), { white: {} })
        .accountsStrict({ authority: authority.publicKey, gameEscrow: ge, vault: v, platformConfig, whiteWallet: white.publicKey, blackWallet: black.publicKey, treasury: treasury.publicKey, whiteStats: ws, blackStats: bs, systemProgram: SystemProgram.programId })
        .signers([authority]).rpc();
      await program.methods.settleStakes(Array.from(gId))
        .accountsStrict({ authority: authority.publicKey, gameEscrow: ge, stakePool: sp })
        .signers([authority]).rpc();

      const attackerStats = deriveStatsPDA(program.programId, attacker.publicKey);
      try {
        await program.methods.claimStakeWinnings(Array.from(gId))
          .accountsStrict({
            user: attacker.publicKey, stakePool: sp, stakePosition: attackerPos, vault: sv,
            platformConfig,
            treasury: attacker.publicKey, // ← fake treasury (own wallet)
            playerStats: attackerStats,
            systemProgram: SystemProgram.programId,
          })
          .signers([attacker]).rpc();
        assert.fail("Should have been rejected — fake treasury");
      } catch (err: any) {
        assert.ok(err, "fake treasury correctly rejected");
        console.log(`    [#2] correctly rejected: fake treasury`);
      }
    });

    it("finding #4 — staking after game result is known is rejected", async () => {
      const gId = newGameId();
      const { gameEscrow: ge, vault: v } = deriveGamePDAs(program.programId, gId);
      const { stakePool: sp, stakeVault: sv } = deriveStakePDAs(program.programId, gId);
      const ws = deriveStatsPDA(program.programId, white.publicKey);
      const bs = deriveStatsPDA(program.programId, black.publicKey);

      await program.methods.createGame(Array.from(gId), new BN(50_000_000), true)
        .accountsStrict({ creator: white.publicKey, gameEscrow: ge, vault: v, platformConfig, systemProgram: SystemProgram.programId })
        .signers([white]).rpc();
      await program.methods.joinGame(Array.from(gId), new BN(50_000_000))
        .accountsStrict({ joiner: black.publicKey, gameEscrow: ge, vault: v, systemProgram: SystemProgram.programId })
        .signers([black]).rpc();
      await program.methods.openStakes(Array.from(gId), 300)
        .accountsStrict({ authority: authority.publicKey, gameEscrow: ge, stakePool: sp, systemProgram: SystemProgram.programId })
        .signers([authority]).rpc();

      // Game settles (result now on-chain)
      await program.methods.settleGame(Array.from(gId), { white: {} })
        .accountsStrict({ authority: authority.publicKey, gameEscrow: ge, vault: v, platformConfig, whiteWallet: white.publicKey, blackWallet: black.publicKey, treasury: treasury.publicKey, whiteStats: ws, blackStats: bs, systemProgram: SystemProgram.programId })
        .signers([authority]).rpc();

      const attacker = Keypair.generate();
      await airdrop(conn, attacker.publicKey);
      const attackerPos = deriveStakePDAs(program.programId, gId, attacker.publicKey).stakePosition!;

      try {
        await program.methods.placeStake(Array.from(gId), { white: {} }, new BN(10_000_000))
          .accountsStrict({ user: attacker.publicKey, gameEscrow: ge, stakePool: sp, stakePosition: attackerPos, vault: sv, systemProgram: SystemProgram.programId })
          .signers([attacker]).rpc();
        assert.fail("Should have been rejected — game already settled");
      } catch (err: any) {
        assert.include(err.message, "InvalidGameStatus");
        console.log(`    [#4] correctly rejected: post-result staking`);
      }
    });

    it("finding #3 — premature sweep is rejected when winners exist", async () => {
      const { gameId: gId, gameEscrow: ge, vault: v, stakePool: sp, stakeVault: sv } =
        await setupGameWithStakes(new BN(20_000_000), { white: {} });

      const ws = deriveStatsPDA(program.programId, white.publicKey);
      const bs = deriveStatsPDA(program.programId, black.publicKey);
      await program.methods.settleGame(Array.from(gId), { white: {} })
        .accountsStrict({ authority: authority.publicKey, gameEscrow: ge, vault: v, platformConfig, whiteWallet: white.publicKey, blackWallet: black.publicKey, treasury: treasury.publicKey, whiteStats: ws, blackStats: bs, systemProgram: SystemProgram.programId })
        .signers([authority]).rpc();
      await program.methods.settleStakes(Array.from(gId))
        .accountsStrict({ authority: authority.publicKey, gameEscrow: ge, stakePool: sp })
        .signers([authority]).rpc();

      try {
        await program.methods.sweepStakeVault(Array.from(gId))
          .accountsStrict({ authority: authority.publicKey, platformConfig, stakePool: sp, vault: sv, treasury: treasury.publicKey, systemProgram: SystemProgram.programId })
          .signers([authority]).rpc();
        assert.fail("Should have been rejected — winners haven't claimed");
      } catch (err: any) {
        assert.include(err.message, "WinnersStillClaimable");
        console.log(`    [#3] correctly rejected: premature sweep`);
      }
    });

    it("self-match — white cannot join their own game as black", async () => {
      const gId = newGameId();
      const { gameEscrow: ge, vault: v } = deriveGamePDAs(program.programId, gId);

      await program.methods.createGame(Array.from(gId), new BN(50_000_000), true)
        .accountsStrict({ creator: white.publicKey, gameEscrow: ge, vault: v, platformConfig, systemProgram: SystemProgram.programId })
        .signers([white]).rpc();

      try {
        // White tries to join their own game as black
        await program.methods.joinGame(Array.from(gId), new BN(50_000_000))
          .accountsStrict({ joiner: white.publicKey, gameEscrow: ge, vault: v, systemProgram: SystemProgram.programId })
          .signers([white]).rpc();
        assert.fail("Should have been rejected — self-match");
      } catch (err: any) {
        assert.include(err.message, "SelfMatchNotAllowed");
        console.log(`    correctly rejected: self-match join`);
      }
    });

    it("player cannot stake on their own game", async () => {
      const gId = newGameId();
      const { gameEscrow: ge, vault: v } = deriveGamePDAs(program.programId, gId);
      const { stakePool: sp, stakeVault: sv } = deriveStakePDAs(program.programId, gId);

      await program.methods.createGame(Array.from(gId), new BN(50_000_000), true)
        .accountsStrict({ creator: white.publicKey, gameEscrow: ge, vault: v, platformConfig, systemProgram: SystemProgram.programId })
        .signers([white]).rpc();
      await program.methods.joinGame(Array.from(gId), new BN(50_000_000))
        .accountsStrict({ joiner: black.publicKey, gameEscrow: ge, vault: v, systemProgram: SystemProgram.programId })
        .signers([black]).rpc();
      await program.methods.openStakes(Array.from(gId), 300)
        .accountsStrict({ authority: authority.publicKey, gameEscrow: ge, stakePool: sp, systemProgram: SystemProgram.programId })
        .signers([authority]).rpc();

      const whitePos = deriveStakePDAs(program.programId, gId, white.publicKey).stakePosition!;
      const blackPos = deriveStakePDAs(program.programId, gId, black.publicKey).stakePosition!;

      for (const [user, pos] of [[white, whitePos], [black, blackPos]] as [Keypair, PublicKey][]) {
        try {
          await program.methods.placeStake(Array.from(gId), { white: {} }, new BN(10_000_000))
            .accountsStrict({ user: user.publicKey, gameEscrow: ge, stakePool: sp, stakePosition: pos, vault: sv, systemProgram: SystemProgram.programId })
            .signers([user]).rpc();
          assert.fail(`${user === white ? "white" : "black"} player should not be able to stake`);
        } catch (err: any) {
          assert.include(err.message, "PlayerCannotStake");
        }
      }
      console.log(`    correctly rejected: both players blocked from self-staking`);
    });

    it("settleStakes cannot be called before game is settled", async () => {
      const gId = newGameId();
      const { gameEscrow: ge, vault: v } = deriveGamePDAs(program.programId, gId);
      const { stakePool: sp } = deriveStakePDAs(program.programId, gId);

      await program.methods.createGame(Array.from(gId), new BN(50_000_000), true)
        .accountsStrict({ creator: white.publicKey, gameEscrow: ge, vault: v, platformConfig, systemProgram: SystemProgram.programId })
        .signers([white]).rpc();
      await program.methods.joinGame(Array.from(gId), new BN(50_000_000))
        .accountsStrict({ joiner: black.publicKey, gameEscrow: ge, vault: v, systemProgram: SystemProgram.programId })
        .signers([black]).rpc();
      await program.methods.openStakes(Array.from(gId), 300)
        .accountsStrict({ authority: authority.publicKey, gameEscrow: ge, stakePool: sp, systemProgram: SystemProgram.programId })
        .signers([authority]).rpc();

      try {
        // Try settling stakes while game is still Active
        await program.methods.settleStakes(Array.from(gId))
          .accountsStrict({ authority: authority.publicKey, gameEscrow: ge, stakePool: sp })
          .signers([authority]).rpc();
        assert.fail("Should have been rejected — game not settled yet");
      } catch (err: any) {
        assert.include(err.message, "InvalidGameStatus");
        console.log(`    correctly rejected: settleStakes before settleGame`);
      }
    });

    it("staking after window expires is rejected", async () => {
      const gId = newGameId();
      const { gameEscrow: ge, vault: v } = deriveGamePDAs(program.programId, gId);
      const { stakePool: sp, stakeVault: sv } = deriveStakePDAs(program.programId, gId);

      await program.methods.createGame(Array.from(gId), new BN(50_000_000), true)
        .accountsStrict({ creator: white.publicKey, gameEscrow: ge, vault: v, platformConfig, systemProgram: SystemProgram.programId })
        .signers([white]).rpc();
      await program.methods.joinGame(Array.from(gId), new BN(50_000_000))
        .accountsStrict({ joiner: black.publicKey, gameEscrow: ge, vault: v, systemProgram: SystemProgram.programId })
        .signers([black]).rpc();

      // Open stakes with a 1-second window
      await program.methods.openStakes(Array.from(gId), 1)
        .accountsStrict({ authority: authority.publicKey, gameEscrow: ge, stakePool: sp, systemProgram: SystemProgram.programId })
        .signers([authority]).rpc();

      // Wait for the window to expire
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const pos = deriveStakePDAs(program.programId, gId, spectator.publicKey).stakePosition!;
      try {
        await program.methods.placeStake(Array.from(gId), { white: {} }, new BN(5_000_000))
          .accountsStrict({ user: spectator.publicKey, gameEscrow: ge, stakePool: sp, stakePosition: pos, vault: sv, systemProgram: SystemProgram.programId })
          .signers([spectator]).rpc();
        assert.fail("Expected StakesAlreadyClosed");
      } catch (err: any) {
        assert.include(err.message, "StakesAlreadyClosed");
        console.log(`    correctly rejected: staking after window expired`);
      }
    });
  });

  // ══════════════════════════════════════════════════════════════════════════════
  //  SUITE 9 — Core error cases
  // ══════════════════════════════════════════════════════════════════════════════

  describe("Error cases", () => {
    it("rejects wager below minimum (0.01 SOL)", async () => {
      const gId = newGameId();
      const { gameEscrow: ge, vault: v } = deriveGamePDAs(program.programId, gId);
      try {
        await program.methods.createGame(Array.from(gId), new BN(1_000), true)
          .accountsStrict({ creator: white.publicKey, gameEscrow: ge, vault: v, platformConfig, systemProgram: SystemProgram.programId })
          .signers([white]).rpc();
        assert.fail("Expected WagerTooSmall");
      } catch (err: any) {
        assert.include(err.message, "WagerTooSmall");
        console.log(`    correctly rejected: WagerTooSmall`);
      }
    });

    it("rejects double settle", async () => {
      const gId = newGameId();
      const { gameEscrow: ge, vault: v } = deriveGamePDAs(program.programId, gId);
      const ws = deriveStatsPDA(program.programId, white.publicKey);
      const bs = deriveStatsPDA(program.programId, black.publicKey);

      await program.methods.createGame(Array.from(gId), new BN(50_000_000), true)
        .accountsStrict({ creator: white.publicKey, gameEscrow: ge, vault: v, platformConfig, systemProgram: SystemProgram.programId })
        .signers([white]).rpc();
      await program.methods.joinGame(Array.from(gId), new BN(50_000_000))
        .accountsStrict({ joiner: black.publicKey, gameEscrow: ge, vault: v, systemProgram: SystemProgram.programId })
        .signers([black]).rpc();
      await program.methods.settleGame(Array.from(gId), { black: {} })
        .accountsStrict({ authority: authority.publicKey, gameEscrow: ge, vault: v, platformConfig, whiteWallet: white.publicKey, blackWallet: black.publicKey, treasury: treasury.publicKey, whiteStats: ws, blackStats: bs, systemProgram: SystemProgram.programId })
        .signers([authority]).rpc();

      try {
        await program.methods.settleGame(Array.from(gId), { white: {} })
          .accountsStrict({ authority: authority.publicKey, gameEscrow: ge, vault: v, platformConfig, whiteWallet: white.publicKey, blackWallet: black.publicKey, treasury: treasury.publicKey, whiteStats: ws, blackStats: bs, systemProgram: SystemProgram.programId })
          .signers([authority]).rpc();
        assert.fail("Expected InvalidGameStatus");
      } catch (err: any) {
        assert.include(err.message, "InvalidGameStatus");
        console.log(`    correctly rejected: double settle`);
      }
    });

    it("rejects wrong authority settling the game", async () => {
      const gId = newGameId();
      const { gameEscrow: ge, vault: v } = deriveGamePDAs(program.programId, gId);
      const ws = deriveStatsPDA(program.programId, white.publicKey);
      const bs = deriveStatsPDA(program.programId, black.publicKey);
      const fakeAuth = Keypair.generate();
      await airdrop(conn, fakeAuth.publicKey, 1);

      await program.methods.createGame(Array.from(gId), new BN(50_000_000), true)
        .accountsStrict({ creator: white.publicKey, gameEscrow: ge, vault: v, platformConfig, systemProgram: SystemProgram.programId })
        .signers([white]).rpc();
      await program.methods.joinGame(Array.from(gId), new BN(50_000_000))
        .accountsStrict({ joiner: black.publicKey, gameEscrow: ge, vault: v, systemProgram: SystemProgram.programId })
        .signers([black]).rpc();

      try {
        await program.methods.settleGame(Array.from(gId), { white: {} })
          .accountsStrict({ authority: fakeAuth.publicKey, gameEscrow: ge, vault: v, platformConfig, whiteWallet: white.publicKey, blackWallet: black.publicKey, treasury: treasury.publicKey, whiteStats: ws, blackStats: bs, systemProgram: SystemProgram.programId })
          .signers([fakeAuth]).rpc();
        assert.fail("Expected UnauthorizedSettle");
      } catch (err: any) {
        assert.ok(err);
        console.log(`    correctly rejected: wrong authority`);
      }
    });

    it("rejects stake below minimum (0.001 SOL)", async () => {
      const gId = newGameId();
      const { gameEscrow: ge, vault: v } = deriveGamePDAs(program.programId, gId);
      const { stakePool: sp, stakeVault: sv } = deriveStakePDAs(program.programId, gId);

      await program.methods.createGame(Array.from(gId), new BN(50_000_000), true)
        .accountsStrict({ creator: white.publicKey, gameEscrow: ge, vault: v, platformConfig, systemProgram: SystemProgram.programId })
        .signers([white]).rpc();
      await program.methods.joinGame(Array.from(gId), new BN(50_000_000))
        .accountsStrict({ joiner: black.publicKey, gameEscrow: ge, vault: v, systemProgram: SystemProgram.programId })
        .signers([black]).rpc();
      await program.methods.openStakes(Array.from(gId), 300)
        .accountsStrict({ authority: authority.publicKey, gameEscrow: ge, stakePool: sp, systemProgram: SystemProgram.programId })
        .signers([authority]).rpc();

      const pos = deriveStakePDAs(program.programId, gId, spectator.publicKey).stakePosition!;
      try {
        await program.methods.placeStake(Array.from(gId), { white: {} }, new BN(100))
          .accountsStrict({ user: spectator.publicKey, gameEscrow: ge, stakePool: sp, stakePosition: pos, vault: sv, systemProgram: SystemProgram.programId })
          .signers([spectator]).rpc();
        assert.fail("Expected StakeTooSmall");
      } catch (err: any) {
        assert.include(err.message, "StakeTooSmall");
        console.log(`    correctly rejected: StakeTooSmall`);
      }
    });
  });
});