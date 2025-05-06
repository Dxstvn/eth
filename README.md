# Crypto Escrow Platform

A decentralized escrow platform for secure property transactions using blockchain technology, smart contracts, and secure document storage.

![Crypto Escrow Platform](/public/blockchain-real-estate-overview.png)

## Overview

Crypto Escrow is a Next.js application that facilitates secure property transactions between buyers and sellers using blockchain technology. The platform leverages smart contracts to create a trustless escrow system, allowing parties to transact without requiring a traditional third-party intermediary.

## Current Status

**⚠️ IMPORTANT: This is currently a simulation/prototype**

- The application uses mock data and simulated blockchain interactions
- Smart contracts are not deployed to a live blockchain
- Firebase authentication is functional but using a development configuration
- Document storage uses Firestore Database and Google Cloud Storage
- Wallet connections use EIP-6963 for discovery but transactions are simulated

## Features

### Authentication
- Email/password authentication via Firebase
- User profile management
- Secure routes and protected pages

### Wallet Integration
- Support for multiple wallet providers (MetaMask, Coinbase Wallet, etc.)
- EIP-6963 wallet discovery
- Wallet connection management
- Transaction history and balance display

### Contact Management
- Send and receive contact invitations
- Manage your network of contacts
- Select contacts for transactions

### Document Management
- Upload and store documents securely with Google Cloud Storage
- Document verification and signing
- Secure document sharing between transaction parties

### Two-Stage Transaction Process
- **Seller-Initiated Transactions**:
  1. Seller creates transaction with property details
  2. Buyer reviews and adds conditions (title deeds, inspections, etc.)
  3. Buyer deposits funds into smart contract
  4. Seller confirms conditions
  5. Smart contract is deployed

- **Buyer-Initiated Transactions**:
  1. Buyer creates transaction with property details and conditions
  2. Buyer deposits funds into smart contract
  3. Seller is notified of the transaction

### Dashboard & Analytics
- Transaction overview and statistics
- Recent activity tracking
- Upcoming deadlines and reminders

## Technology Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript, Tailwind CSS
- **Authentication**: Firebase Authentication
- **Database**: Firestore Database
- **Storage**: Google Cloud Storage
- **Blockchain Integration**: EIP-6963 for wallet discovery
- **State Management**: React Context API
- **Styling**: Tailwind CSS with shadcn/ui components

## Getting Started

### Prerequisites
- Node.js 18+ and npm/yarn
- Firebase account (for authentication, Firestore, and Storage)
- MetaMask or another EIP-6963 compatible wallet

### Environment Variables

Create a `.env.local` file with the following variables:

\`\`\`
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id

# Google Cloud Storage (optional if using default Firebase Storage)
GOOGLE_CLOUD_PROJECT_ID=your_gcp_project_id
GOOGLE_CLOUD_PRIVATE_KEY=your_gcp_private_key
GOOGLE_CLOUD_CLIENT_EMAIL=your_gcp_client_email
\`\`\`

### Installation

1. Clone the repository
   \`\`\`bash
   git clone https://github.com/yourusername/crypto-escrow.git
   cd crypto-escrow
   \`\`\`

2. Install dependencies
   \`\`\`bash
   npm install
   # or
   yarn install
   \`\`\`

3. Run the development server
   \`\`\`bash
   npm run dev
   # or
   yarn dev
   \`\`\`

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Transaction Flow

### Creating a New Transaction (Seller)

1. Navigate to the Transactions page
2. Click "New Transaction"
3. Select "I am the Seller"
4. Fill in property details and select the buyer from your contacts
5. Submit the transaction
6. The buyer will be notified to review the transaction

### Reviewing a Transaction (Buyer)

1. Navigate to the Transactions page
2. Find the pending transaction and click "Review"
3. Review property details
4. Add conditions (title deeds, inspections, appraisals)
5. Deposit funds to the smart contract
6. The seller will be notified to confirm the conditions

### Confirming Conditions (Seller)

1. Navigate to the Transactions page
2. Find the pending transaction and click "Review Conditions"
3. Review the conditions added by the buyer
4. Confirm the conditions
5. The smart contract will be deployed

## Development Roadmap

### Planned Features

- Integration with live blockchain networks (Ethereum, Polygon)
- Real smart contract deployment
- Multi-signature wallet support
- Escrow dispute resolution mechanism
- Mobile application
- Enhanced analytics and reporting
- Automated document verification

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- [Next.js](https://nextjs.org/)
- [Firebase](https://firebase.google.com/)
- [Google Cloud Storage](https://cloud.google.com/storage)
- [MetaMask](https://metamask.io/)
- [shadcn/ui](https://ui.shadcn.com/)
\`\`\`

Now, let's create a detailed README specifically for the transactions feature:
