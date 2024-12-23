'use client';

import { RainbowKitProvider, connectorsForWallets, getDefaultWallets } from '@rainbow-me/rainbowkit';
import { WagmiConfig, createConfig, configureChains } from 'wagmi';
import { Chain } from 'wagmi/chains';
import { publicProvider } from 'wagmi/providers/public';
import '@rainbow-me/rainbowkit/styles.css';

const greenfield: Chain = {
  id: 5600,
  name: 'Greenfield Testnet',
  network: 'greenfield-testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'BNB',
    symbol: 'tBNB',
  },
  rpcUrls: {
    default: {
      http: ['https://gnfd-testnet-fullnode-tendermint-ap.bnbchain.org'],
    },
    public: {
      http: ['https://gnfd-testnet-fullnode-tendermint-ap.bnbchain.org'],
    },
  },
  testnet: true,
};

// 配置链和提供者
const { chains, publicClient } = configureChains(
  [greenfield],
  [publicProvider()]
);

// 确保从环境变量获取 projectId
const projectId = '9bf3510aab08be54d5181a126967ee71';
if (!projectId) {
  throw new Error('Missing NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID');
}

const { wallets } = getDefaultWallets({
  projectId,
  appName: 'AI Doodle Platform',
  chains,
});

const connectors = connectorsForWallets([
  ...wallets,
]);

const wagmiConfig = createConfig({
  autoConnect: true,
  connectors,
  publicClient,
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiConfig config={wagmiConfig}>
      <RainbowKitProvider modalSize="compact" chains={chains}>
        {children}
      </RainbowKitProvider>
    </WagmiConfig>
  );
} 