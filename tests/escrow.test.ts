// @ts-nocheck
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Keypair, PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import assert from "node:assert/strict";
import {
  TOKEN_PROGRAM_ID,
  createMint,
  getAccount,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";

describe("agritrust_escrow", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.AgritrustEscrow as Program;
  const payer = provider.wallet.payer;
  const buyer = provider.wallet.publicKey;

  async function createEscrowFixture(options?: {
    unitPrice?: number;
    expectedQty?: number;
    deadline?: number;
  }) {
    const unitPrice = new anchor.BN(options?.unitPrice ?? 10);
    const expectedQty = new anchor.BN(options?.expectedQty ?? 5);
    const deadline = new anchor.BN(
      options?.deadline ?? Math.floor(Date.now() / 1000) + 3600
    );
    const totalAmount = BigInt(unitPrice.toNumber() * expectedQty.toNumber());
    const seller = Keypair.generate();

    const mint = await createMint(
      provider.connection,
      payer,
      payer.publicKey,
      null,
      6
    );
    const buyerToken = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      payer,
      mint,
      buyer
    );
    const sellerToken = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      payer,
      mint,
      seller.publicKey
    );
    await mintTo(
      provider.connection,
      payer,
      mint,
      buyerToken.address,
      payer,
      totalAmount
    );

    const [escrowAccount] = PublicKey.findProgramAddressSync(
      [Buffer.from("escrow"), buyer.toBuffer(), seller.publicKey.toBuffer(), mint.toBuffer()],
      program.programId
    );
    const [vault] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), escrowAccount.toBuffer()],
      program.programId
    );

    async function initialize() {
      return program.methods
        .initialize(unitPrice, expectedQty, deadline, seller.publicKey)
        .accounts({
          buyer,
          seller: seller.publicKey,
          mint,
          buyerTokenAccount: buyerToken.address,
          sellerTokenAccount: sellerToken.address,
          escrowAccount,
          vault,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .rpc();
    }

    return {
      unitPrice,
      expectedQty,
      deadline,
      totalAmount,
      seller,
      mint,
      buyerToken: buyerToken.address,
      sellerToken: sellerToken.address,
      escrowAccount,
      vault,
      initialize,
    };
  }

  it("initialize locks buyer funds in the vault", async () => {
    const fixture = await createEscrowFixture();
    await fixture.initialize();

    const vaultAccount = await getAccount(provider.connection, fixture.vault);
    const escrow = await program.account.escrowAccount.fetch(fixture.escrowAccount);

    assert.equal(vaultAccount.amount, fixture.totalAmount);
    assert.equal(escrow.buyer.toBase58(), buyer.toBase58());
    assert.equal(escrow.seller.toBase58(), fixture.seller.publicKey.toBase58());
    assert.ok("locked" in escrow.status);
  });

  it("confirm_receipt pays 100% to seller and blocks duplicate calls", async () => {
    const fixture = await createEscrowFixture();
    await fixture.initialize();

    await program.methods
      .confirmReceipt()
      .accounts({
        buyer,
        seller: fixture.seller.publicKey,
        mint: fixture.mint,
        sellerTokenAccount: fixture.sellerToken,
        vault: fixture.vault,
        escrowAccount: fixture.escrowAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    const sellerToken = await getAccount(provider.connection, fixture.sellerToken);
    const vaultToken = await getAccount(provider.connection, fixture.vault);
    const escrow = await program.account.escrowAccount.fetch(fixture.escrowAccount);

    assert.equal(sellerToken.amount, fixture.totalAmount);
    assert.equal(vaultToken.amount, 0n);
    assert.ok("resolved" in escrow.status);

    await assert.rejects(
      program.methods
        .confirmReceipt()
        .accounts({
          buyer,
          seller: fixture.seller.publicKey,
          mint: fixture.mint,
          sellerTokenAccount: fixture.sellerToken,
          vault: fixture.vault,
          escrowAccount: fixture.escrowAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc()
    );
  });

  it("resolve_partial pays seller by actual quantity and refunds buyer", async () => {
    const fixture = await createEscrowFixture({ unitPrice: 10, expectedQty: 5 });
    await fixture.initialize();

    await program.methods
      .resolvePartial(new anchor.BN(3))
      .accounts({
        buyer,
        seller: fixture.seller.publicKey,
        mint: fixture.mint,
        buyerTokenAccount: fixture.buyerToken,
        sellerTokenAccount: fixture.sellerToken,
        vault: fixture.vault,
        escrowAccount: fixture.escrowAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    const buyerToken = await getAccount(provider.connection, fixture.buyerToken);
    const sellerToken = await getAccount(provider.connection, fixture.sellerToken);
    const vaultToken = await getAccount(provider.connection, fixture.vault);

    assert.equal(sellerToken.amount, 30n);
    assert.equal(buyerToken.amount, 20n);
    assert.equal(vaultToken.amount, 0n);
  });

  it("claim_timeout pays seller after deadline and blocks duplicate calls", async () => {
    const fixture = await createEscrowFixture({
      deadline: Math.floor(Date.now() / 1000) - 60,
    });
    await fixture.initialize();

    await program.methods
      .claimTimeout()
      .accounts({
        seller: fixture.seller.publicKey,
        buyer,
        mint: fixture.mint,
        sellerTokenAccount: fixture.sellerToken,
        vault: fixture.vault,
        escrowAccount: fixture.escrowAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([fixture.seller])
      .rpc();

    const sellerToken = await getAccount(provider.connection, fixture.sellerToken);
    const escrow = await program.account.escrowAccount.fetch(fixture.escrowAccount);

    assert.equal(sellerToken.amount, fixture.totalAmount);
    assert.ok("timedOut" in escrow.status);

    await assert.rejects(
      program.methods
        .claimTimeout()
        .accounts({
          seller: fixture.seller.publicKey,
          buyer,
          mint: fixture.mint,
          sellerTokenAccount: fixture.sellerToken,
          vault: fixture.vault,
          escrowAccount: fixture.escrowAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([fixture.seller])
        .rpc()
    );
  });
});
