// Import necessary dependencies from Anchor framework
use anchor_lang::prelude::*;
// Import token-related functionality from Solana Program Library (SPL)
use anchor_spl::token::{self, Mint, Token, TokenAccount, MintTo, Burn};
use anchor_lang::system_program::{self, Transfer};



// Declare the program's unique identifier
declare_id!("ExiyW5RS1e4XxjxeZHktijRhnYF6sJYzfmdzU85gFbS4");

// Main program module containing all instruction handlers
#[program]
pub mod bonding_curve_new {
    use super::*;

    // Initialize the bonding curve with initial parameters
    pub fn initialize(
        ctx: Context<Initialize>,  // Context containing account information
        initial_price: u64,        // Starting price per token
        slope: u64,                // Price increase per token
    ) -> Result<()> {
        // Input validation - ensure non-zero values
        if initial_price == 0 || slope == 0 {
            return Err(ErrorCode::InvalidParameters.into());
        }

        // Get mutable reference to the bonding curve account
        let bonding_curve = &mut ctx.accounts.bonding_curve;
        
        // Set initial state values
        bonding_curve.authority = ctx.accounts.authority.key();
        bonding_curve.token_mint = ctx.accounts.token_mint.key();
        bonding_curve.initial_price = initial_price;
        bonding_curve.slope = slope;
        bonding_curve.total_supply = 0;
        bonding_curve.bump = ctx.bumps.bonding_curve;
        
        // Log the parameters
        msg!("Bonding curve initialized with initial price: {} lamports, slope: {} lamports", 
            initial_price, slope);
        
        Ok(())
    }

    // Function to buy tokens from the bonding curve
    pub fn buy_tokens(
        ctx: Context<BuyTokens>,
        amount: u64,
    ) -> Result<()> {
        // Validate input
        if amount == 0 {
            return Err(ErrorCode::InvalidAmount.into());
        }

        let bonding_curve = &ctx.accounts.bonding_curve;

        // Ensure the token_mint matches what's stored in the bonding curve account
        if bonding_curve.token_mint != ctx.accounts.token_mint.key() {
            return Err(ErrorCode::InvalidTokenMint.into());
        }

        let current_price = bonding_curve.initial_price
            .checked_add(bonding_curve.total_supply
                .checked_mul(bonding_curve.slope)
                .ok_or(ErrorCode::Overflow)?)
            .ok_or(ErrorCode::Overflow)?;

        let cost = current_price
            .checked_mul(amount)
            .ok_or(ErrorCode::Overflow)?;

        // Log the purchase details
        msg!("Buying {} tokens at {} lamports per token. Total cost: {} lamports", 
            amount, current_price, cost);

        // Transfer SOL from buyer to bonding curve account
        let transfer_ctx = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            SystemTransfer {
                from: ctx.accounts.buyer.to_account_info(),
                to: ctx.accounts.bonding_curve.to_account_info(),
            },
        );
        system_program::transfer(transfer_ctx, cost)?;

        // Mint tokens to buyer
        // Create seeds with token mint for PDA derivation
        let token_mint_key = ctx.accounts.token_mint.key();
        let seeds = &[
            b"bonding_curve".as_ref(),
            token_mint_key.as_ref(),
            &[bonding_curve.bump]
        ];
        let signer = &[&seeds[..]];

        let mint_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            MintTo {
                mint: ctx.accounts.token_mint.to_account_info(),
                to: ctx.accounts.buyer_token_account.to_account_info(),
                authority: ctx.accounts.bonding_curve.to_account_info(),
            },
            signer,
        );
        token::mint_to(mint_ctx, amount)?;

        // Update state
        let bonding_curve = &mut ctx.accounts.bonding_curve;
        bonding_curve.total_supply = bonding_curve.total_supply
            .checked_add(amount)
            .ok_or(ErrorCode::Overflow)?;

        Ok(())
    }

    // Function to sell tokens back to the bonding curve
    pub fn sell_tokens(
        ctx: Context<SellTokens>,
        amount: u64,
    ) -> Result<()> {
        // Validate input
        if amount == 0 {
            return Err(ErrorCode::InvalidAmount.into());
        }

        let bonding_curve = &ctx.accounts.bonding_curve;

        // Ensure the token mint matches what's stored in the bonding curve
        if bonding_curve.token_mint != ctx.accounts.token_mint.key() {
            return Err(ErrorCode::InvalidTokenMint.into());
        }

        if ctx.accounts.seller_token_account.owner != ctx.accounts.seller.key()
            || ctx.accounts.seller_token_account.mint != ctx.accounts.token_mint.key() {
            return Err(ErrorCode::InvalidTokenAccount.into());
        }

        let current_price = bonding_curve.initial_price
            .checked_add(bonding_curve.total_supply
                .checked_mul(bonding_curve.slope)
                .ok_or(ErrorCode::Overflow)?)
            .ok_or(ErrorCode::Overflow)?;

        let refund = current_price
            .checked_mul(amount)
            .ok_or(ErrorCode::Overflow)?;

        // Log the sell details
        msg!("Selling {} tokens at {} lamports per token. Total refund: {} lamports", 
            amount, current_price, refund);

        // Burn tokens from seller
        let burn_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Burn {
                mint: ctx.accounts.token_mint.to_account_info(),
                from: ctx.accounts.seller_token_account.to_account_info(),
                authority: ctx.accounts.bonding_curve.to_account_info(),
            },
            signer,
        );
        token::burn(burn_ctx, amount)?;

        // Send SOL back to seller
        **ctx.accounts.bonding_curve.to_account_info().try_borrow_mut_lamports()? -= refund;
        **ctx.accounts.seller.to_account_info().try_borrow_mut_lamports()? += refund;

        // Update state
        let bonding_curve = &mut ctx.accounts.bonding_curve;
        bonding_curve.total_supply = bonding_curve.total_supply
            .checked_sub(amount)
            .ok_or(ErrorCode::Overflow)?;

        Ok(())
    }

    pub fn update_parameters(
        ctx: Context<UpdateParameters>,
        initial_price: u64,
        slope: u64,
    ) -> Result<()> {
        if initial_price == 0 || slope == 0 {
            return Err(ErrorCode::InvalidParameters.into());
        }

        let bonding_curve = &mut ctx.accounts.bonding_curve;

        // Only the authority can update parameters
        if bonding_curve.authority != ctx.accounts.authority.key() {
            return Err(ErrorCode::Unauthorized.into());
        }

        // Store the old values for logging
        let old_initial_price = bonding_curve.initial_price;
        let old_slope = bonding_curve.slope;

        // Update the parameters
        bonding_curve.initial_price = initial_price;
        bonding_curve.slope = slope;

        // Log the changes
        msg!("Bonding curve parameters updated: initial_price {} -> {}, slope {} -> {}", 
            old_initial_price, initial_price, old_slope, slope);

        Ok(())
    }
}

// Account validation structure for initialization
#[derive(Accounts)]
#[instruction(initial_price: u64, slope: u64)]
pub struct Initialize<'info> {
    // Define bonding curve account with initialization constraints
    #[account(
        init,
        payer = authority,
        space = 8 + 32 + 8 + 8 + 8 + 32 + 1, // discriminator + fields
        seeds = [b"bonding_curve".as_ref(), token_mint.key().as_ref()],
        bump
    )]
    pub bonding_curve: Account<'info, BondingCurve>,
    
    // Token mint that this bonding curve will be associated with
    pub token_mint: Account<'info, Mint>,
    
    // Authority must be a signer and can be modified
    #[account(mut)]
    pub authority: Signer<'info>,
    
    // System program for account creation
    #[account(address = system_program::ID)]
    pub system_program: Program<'info, System>,
}

// Account validation structure for buying tokens
#[derive(Accounts)]
pub struct BuyTokens<'info> {
    // Bonding curve account must exist and be mutable
    #[account(
        mut,
        seeds = [b"bonding_curve".as_ref(), token_mint.key().as_ref()],
        bump = bonding_curve.bump
    )]
    pub bonding_curve: Account<'info, BondingCurve>,
    
    // Token mint associated with this bonding curve
    #[account(mut)]
    pub token_mint: Account<'info, Mint>,
    
    // Token account of the buyer
    #[account(
        mut,
        constraint = buyer_token_account.mint == token_mint.key(),
        constraint = buyer_token_account.owner == buyer.key()
    )]
    pub buyer_token_account: Account<'info, TokenAccount>,
    
    // Buyer must be a signer and can be modified
    #[account(mut)]
    pub buyer: Signer<'info>,
    
    // Token program for minting tokens
    #[account(address = token::ID)]
    pub token_program: Program<'info, Token>,
    
    // System program for transfers
    #[account(address = system_program::ID)]
    pub system_program: Program<'info, System>,
}

// Account validation structure for selling tokens
#[derive(Accounts)]
pub struct SellTokens<'info> {
    // Bonding curve account must exist and be mutable
    #[account(
        mut,
        seeds = [b"bonding_curve".as_ref(), token_mint.key().as_ref()],
        bump = bonding_curve.bump
    )]
    pub bonding_curve: Account<'info, BondingCurve>,
    
    // Token mint associated with this bonding curve
    #[account(mut)]
    pub token_mint: Account<'info, Mint>,
    
    // Token account of the seller
    #[account(
        mut,
        constraint = seller_token_account.mint == token_mint.key(),
        constraint = seller_token_account.owner == seller.key()
    )]
    pub seller_token_account: Account<'info, TokenAccount>,
    
    // Seller must be a signer and can be modified
    #[account(mut)]
    pub seller: Signer<'info>,
    
    // Token program for burning tokens
    pub token_program: Program<'info, Token>,
    
    // System program for transfers
    pub system_program: Program<'info, System>,
}

// State account structure for the bonding curve
#[account]
pub struct BondingCurveState {
    pub authority: Pubkey,      // Admin's public key
    pub token_mint: Pubkey,     // The token mint this curve is for
    pub initial_price: u64,     // Starting price per token
    pub slope: u64,             // Price increase per token
    pub total_supply: u64,      // Total tokens in circulation
    pub bump: u8,               // PDA bump seed
}

// Helper function to calculate token price based on supply
fn calculate_price(supply: u64, initial_price: u64, slope: u64) -> u64 {
    // Price = initial_price + (supply * slope)
    // Use checked operations to prevent overflow
    initial_price
        .checked_add(
            supply.checked_mul(slope).unwrap_or(u64::MAX)
        )
        .unwrap_or(u64::MAX)
}

// Custom error types for the program
#[error_code]
pub enum ErrorCode {
    #[msg("Operation would result in overflow")]
    Overflow,
    
    #[msg("Operation would result in underflow")]
    Underflow,
    
    #[msg("Invalid parameters provided")]
    InvalidParameters,
    
    #[msg("Amount must be greater than zero")]
    InvalidAmount,
    
    #[msg("Insufficient tokens in account")]
    InsufficientTokens,

    #[msg("Unauthorized access")]
    Unauthorized,
} 