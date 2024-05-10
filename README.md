![gearbox](header.png)

## Gearbox protocol

This repository contains the code for [Test Task "Cooking Oracles for Full Stack Position"](https://hackmd.io/@gbGZOElyTdmaGt4KXQ57RQ/ryfdGoJGA) in Gearbox protocol.

### What is Gearbox protocol?

Gearbox is a generalized leverage protocol: it allows you to take leverage in one place and then use it across various
DeFi protocols and platforms in a composable way. The protocol has two sides to it: passive liquidity providers who earn higher APY
by providing liquidity; active traders, farmers, or even other protocols who can borrow those assets to trade or farm with x4+ leverage.

Gearbox protocol is a Marketmake ETHGlobal hackathon finalist.

## Usage

### Getting Started

First, install the dependencies:

```bash
yarn
```

Generate types:

```bash
yarn generate-types
```

Create .env file according to .env.example

### Set Limiters on a multiple chains

To set limiters on all chains run:

```bash
yarn set-limiters-multi-chain
```

### Set Limiters on a single chain

To set limiters on a specific chain run:

```bash
yarn set-limiters-single-chain [chainId]
```

Replace `[chainId]` with the id of chain you need. For example:

```
yarn set-limiters-single-chain 1
```

## Supported chains

- Ethereum (1)
- Arbitrum (42161)
- Optimism (10)
