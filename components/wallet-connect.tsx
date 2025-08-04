"use client";

import { useState } from "react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { motion } from "framer-motion";
import { useSolanaWallet } from "@/contexts/solana-wallet-context";
import { Button } from "@/components/ui/button";
import { Copy, Check, ExternalLink } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * Wallet connect component
 */
const WalletConnect = () => {
  const { wallet, balance, network } = useSolanaWallet();
  const { setVisible } = useWalletModal();
  const [copied, setCopied] = useState(false);

  // Shorten wallet address for display
  const shortenAddress = (address?: string, chars = 4) => {
    if (!address) return "";
    return `${address.slice(0, chars)}...${address.slice(-chars)}`;
  };

  // Handle copy address to clipboard
  const copyAddress = () => {
    if (wallet.publicKey) {
      navigator.clipboard.writeText(wallet.publicKey.toString());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Format balance for display
  const formatBalance = (bal: number) => {
    if (bal === null || bal === undefined) return "0";
    return bal.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    });
  };

  // Handle connect/disconnect
  const handleConnect = () => {
    setVisible(true);
  };

  const handleDisconnect = () => {
    wallet.disconnect();
  };

  const openExplorer = () => {
    if (wallet.publicKey) {
      // Always use mainnet-beta for explorer links
      const explorerUrl = `https://explorer.solana.com/address/${wallet.publicKey.toString()}`;
      window.open(explorerUrl, "_blank");
    }
  };

  if (!wallet.connected) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <Button
          onClick={handleConnect}
          className="bg-primary hover:bg-primary/90"
        >
          Connect Wallet
        </Button>
      </motion.div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="border-primary/20 hover:bg-primary/10"
        >
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-500"></div>
            <span className="hidden sm:inline">
              {shortenAddress(wallet.publicKey?.toString())}
            </span>
            <span>{formatBalance(balance)} SOL</span>
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>My Wallet</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={copyAddress}
          className="cursor-pointer flex justify-between"
        >
          <span>{shortenAddress(wallet.publicKey?.toString(), 8)}</span>
          {copied ? <Check size={16} /> : <Copy size={16} />}
        </DropdownMenuItem>
        <DropdownMenuItem className="flex justify-between">
          <span>Balance</span>
          <span>{formatBalance(balance)} SOL</span>
        </DropdownMenuItem>
        <DropdownMenuItem className="flex justify-between">
          <span>Network</span>
          <span className="capitalize">{network.toLowerCase()}</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={openExplorer}
          className="cursor-pointer flex items-center gap-2"
        >
          <ExternalLink size={16} />
          <span>View on Explorer</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={handleDisconnect}
          className="cursor-pointer text-destructive focus:text-destructive"
        >
          Disconnect
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default WalletConnect;
