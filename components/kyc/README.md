# KYC Secure File Upload Component

## Overview

The `SecureFileUpload` component is a comprehensive file upload solution designed specifically for KYC (Know Your Customer) document verification. It provides enterprise-grade security features while maintaining an intuitive user experience.

## Features

### Security Features
- **End-to-End Encryption**: Files are encrypted using AES-256-CBC with HMAC authentication before upload
- **Watermarking**: Automatic watermarking of images with customizable text
- **File Validation**: Strict file type and size validation (JPEG, PNG, PDF only, max 10MB)
- **Security Indicators**: Visual security badges and indicators for user trust
- **Progress Tracking**: Real-time upload and encryption progress

### User Experience
- **Drag & Drop**: Intuitive drag-and-drop interface
- **Mobile Support**: Camera capture integration for mobile devices
- **Image Preview**: Secure preview with toggle visibility option
- **Error Handling**: Clear error messages and validation feedback
- **Responsive Design**: Works seamlessly on desktop and mobile

## Usage

```tsx
import { SecureFileUpload } from "@/components/kyc/secure-file-upload"
import { KYCFieldType } from "@/lib/security/kyc-encryption"

<SecureFileUpload
  id="id_front"
  label="Government-Issued ID (Front)"
  description="Upload a clear photo of your ID"
  fieldType={KYCFieldType.DRIVERS_LICENSE}
  onFileSelect={(file, encrypted) => handleFileSelect(file, encrypted)}
  onRemove={() => handleRemove()}
  value={selectedFile}
  preview={filePreview}
  required
  showSecurityIndicators
  enableEncryption
  encryptionPassword={securePassword}
  enableWatermark
  watermarkText="CLEARHOLD KYC"
/>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `id` | string | required | Unique identifier for the input |
| `label` | string | required | Label text for the upload field |
| `description` | string | - | Additional description text |
| `fieldType` | KYCFieldType | required | Type of KYC field for encryption context |
| `onFileSelect` | function | required | Callback when file is selected (file, encrypted) |
| `onRemove` | function | - | Callback when file is removed |
| `value` | File \| null | - | Currently selected file |
| `preview` | string \| null | - | Preview URL for the file |
| `accept` | string | "image/jpeg,image/png,application/pdf" | Accepted file types |
| `required` | boolean | false | Whether the field is required |
| `disabled` | boolean | false | Disable the upload field |
| `className` | string | - | Additional CSS classes |
| `showSecurityIndicators` | boolean | true | Show security badges |
| `enableEncryption` | boolean | true | Enable file encryption |
| `encryptionPassword` | string | - | Password for encryption |
| `enableWatermark` | boolean | true | Enable image watermarking |
| `watermarkText` | string | "CLEARHOLD KYC" | Custom watermark text |

## Security Implementation

### Encryption Process
1. File is validated for type and size
2. If encryption is enabled, file is encrypted using:
   - AES-256-CBC encryption
   - PBKDF2 key derivation (250,000 iterations)
   - HMAC-SHA256 authentication
   - Chunked processing for large files
3. Encryption metadata is generated for audit trail

### Watermarking Process
1. Images are loaded into a canvas element
2. Semi-transparent overlay is applied
3. Watermark text is repeated diagonally across the image
4. Security badge is added to top-left corner
5. Final image is converted to blob for preview

### File Validation
- **Allowed Types**: JPEG, PNG, PDF only
- **Max Size**: 10MB
- **Client-side validation** prevents invalid files from being processed
- **Error messages** guide users to correct issues

## Mobile Considerations

The component automatically detects mobile devices and:
- Enables camera capture with `capture="environment"`
- Shows a dedicated "Take Photo" button
- Adjusts UI for touch interactions
- Maintains full drag-and-drop support

## Accessibility

- Proper ARIA labels and roles
- Keyboard navigation support
- Screen reader friendly error messages
- Focus management during interactions

## Browser Support

- Modern browsers with FileReader API support
- Canvas API for watermarking
- Drag & Drop API
- Mobile camera capture (iOS 11+, Android 5+)

## Integration Example

```tsx
// In your KYC document page
const [encryptionPassword] = useState(() => {
  return `kyc_${user?.uid}_${Date.now()}`
})

const handleFileSelect = (type, file, encrypted) => {
  // Store the file and encrypted data
  setDocuments(prev => ({
    ...prev,
    [type]: {
      file,
      encrypted,
      uploaded: true
    }
  }))
}

// Upload to backend
const uploadDocuments = async () => {
  const encryptedData = documents.map(doc => ({
    type: doc.type,
    encrypted: doc.encrypted,
    metadata: {
      fileName: doc.file.name,
      size: doc.file.size,
      timestamp: Date.now()
    }
  }))
  
  await api.uploadKYCDocuments(encryptedData)
}
```

## Future Enhancements

- [ ] Multiple file upload support
- [ ] Batch encryption for multiple files
- [ ] OCR text extraction for documents
- [ ] Automatic document type detection
- [ ] Biometric data support
- [ ] Blockchain verification integration