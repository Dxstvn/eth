# Transaction System Documentation

This document provides comprehensive information about the transaction system in the Crypto Escrow platform.

![Transaction Flow](/public/blockchain-real-estate-flow.png)

## Overview

The transaction system is the core functionality of the Crypto Escrow platform, enabling secure property transactions between buyers and sellers through a structured, two-stage process secured by blockchain technology.

## Transaction Types

The platform supports two primary transaction flows:

### Seller-Initiated Transactions

In this flow, the seller initiates the transaction process:

1. **Creation Phase**: 
   - Seller creates a transaction with property details
   - Specifies the buyer (must be a contact)
   - Sets the proposed amount

2. **Buyer Review Phase**:
   - Buyer receives notification to review the transaction
   - Reviews property details and proposed amount
   - Can add conditions (e.g., title deed verification, property inspection)
   - Deposits funds to the smart contract escrow

3. **Seller Confirmation Phase**:
   - Seller reviews buyer's conditions
   - Accepts or negotiates conditions
   - Once accepted, smart contract is deployed

4. **Execution Phase**:
   - Conditions are verified through document uploads
   - Once all conditions are met, funds are released
   - Transaction is marked as complete

### Buyer-Initiated Transactions

In this flow, the buyer initiates the transaction process:

1. **Creation Phase**:
   - Buyer creates transaction with property details
   - Specifies the seller (must be a contact)
   - Sets conditions upfront
   - Deposits funds to the smart contract escrow

2. **Seller Review Phase**:
   - Seller receives notification to review the transaction
   - Reviews property details, amount, and conditions
   - Accepts or negotiates terms
   - Once accepted, smart contract is deployed

3. **Execution Phase**:
   - Conditions are verified through document uploads
   - Once all conditions are met, funds are released
   - Transaction is marked as complete

## Transaction Statuses

Transactions progress through several statuses:

- `DRAFT` - Initial creation, not yet submitted
- `PENDING_BUYER_REVIEW` - Awaiting buyer review (seller-initiated)
- `PENDING_SELLER_REVIEW` - Awaiting seller review (buyer-initiated)
- `AWAITING_PAYMENT` - Approved by both parties, awaiting fund deposit
- `PENDING_CONDITIONS` - Funds deposited, waiting for condition fulfillment
- `AWAITING_SELLER_CONFIRMATION` - Conditions added by buyer, waiting for seller confirmation
- `IN_PROGRESS` - Active transaction with conditions
- `COMPLETED` - All conditions met, funds released
- `CANCELLED` - Transaction cancelled by either party
- `DISPUTED` - Transaction under dispute

## Condition Types

The platform supports various condition types that can be added to transactions:

- **Title Deed Verification** - Requires uploading and verification of property title
- **Property Inspection** - Requires satisfactory inspection report
- **Appraisal** - Requires property value appraisal matching or exceeding transaction amount
- **Mortgage Approval** - Requires proof of mortgage approval
- **Custom Conditions** - User-defined conditions with specific requirements

## Document Management

Each transaction contains a document management system:

- Documents are securely stored in Google Cloud Storage
- Each document is associated with a specific condition
- Documents can be uploaded by either party based on condition requirements
- Document status tracking (pending, verified, rejected)
- Secure viewing permissions based on transaction participation

## Technical Implementation

### Data Model

\`\`\`typescript
interface Transaction {
  id: string;
  propertyAddress: string;
  amount: number;
  sellerId: string;
  buyerId: string;
  status: TransactionStatus;
  createdAt: Date;
  updatedAt: Date;
  initiatedBy: 'BUYER' | 'SELLER';
  conditions: Condition[];
  documents: Document[];
  timeline: TimelineEvent[];
  smartContractAddress?: string;
}

interface Condition {
  id: string;
  type: ConditionType;
  description: string;
  status: 'PENDING' | 'FULFILLED' | 'REJECTED';
  requiredDocuments: string[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

interface Document {
  id: string;
  name: string;
  url: string;
  contentType: string;
  size: number;
  uploadedBy: string;
  uploadedAt: Date;
  conditionId?: string;
  status: 'PENDING' | 'VERIFIED' | 'REJECTED';
}
\`\`\`

### Component Architecture

The transaction system consists of the following key components:

1. **Transaction Creation Form** - For initiating new transactions
2. **Transaction Review Component** - For reviewing and adding conditions
3. **Transaction Card** - For displaying transaction overview in listings
4. **Transaction Detail Page** - For comprehensive transaction management
5. **Condition Management** - For adding and tracking conditions
6. **Document Upload** - For condition fulfillment through documentation
7. **Transaction Timeline** - For tracking transaction progression
8. **Smart Contract Interface** - For managing escrow funds

### State Management

Transaction state is managed through:

- Firestore Database for persistent storage
- React Context for client-side state management
- Server actions for secure operations
- Real-time updates using Firestore listeners

## User Experience Considerations

### Role-Based Views

The interface adapts based on the user's role in the transaction:

- **Buyer View** - Focuses on review, conditions, and payment actions
- **Seller View** - Emphasizes property details and condition confirmation

### Notifications

Users receive notifications for key transaction events:

- New transaction invitations
- Condition updates
- Document uploads
- Payment confirmations
- Transaction status changes

### Security Features

- All transaction actions require authentication
- Document access is restricted to transaction participants
- Smart contract operations require wallet signature
- Sensitive operations use server-side validation

## Customization and Extension

### Adding New Condition Types

To add a new condition type:

1. Update the `ConditionType` enum in `types/transaction.ts`
2. Add validation logic in `lib/transaction-validator.ts`
3. Create UI components for the new condition type
4. Update the condition form to include the new type

### Custom Document Verification

The document verification process can be customized by:

1. Implementing verification providers in `lib/document-verification/`
2. Adding verification UI components
3. Configuring verification requirements per condition type

## Troubleshooting

### Common Issues

- **Transaction Stuck in Status**: Usually due to unmet conditions or pending documents
- **Payment Not Confirming**: Check wallet connection and transaction approval
- **Document Upload Failures**: Verify file size and type restrictions

### Support Resources

- Check Firebase console for transaction data issues
- Verify Google Cloud Storage permissions for document access problems
- Review client-side errors in browser console

## Future Enhancements

Planned improvements to the transaction system:

- Multi-party transactions (beyond buyer/seller)
- Advanced dispute resolution mechanisms
- AI-assisted document verification
- Transaction templates for common property types
- Integration with property registration systems
- Partial payment scheduling
