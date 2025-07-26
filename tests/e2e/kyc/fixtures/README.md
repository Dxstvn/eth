# KYC E2E Test Fixtures

This directory should contain the following test fixture files for E2E tests:

## Required Files

### Documents
- `passport-front.jpg` - Sample passport front image
- `passport-back.jpg` - Sample passport back image (if applicable)
- `drivers-license-front.jpg` - Sample driver's license front
- `drivers-license-back.jpg` - Sample driver's license back
- `selfie.jpg` - Sample selfie photo for face matching
- `utility-bill.pdf` - Sample utility bill for address proof
- `bank-statement.pdf` - Sample bank statement

### Test Cases
- `blurry-passport.jpg` - Low quality image for OCR failure testing
- `fake-passport.jpg` - Image that will fail authenticity checks
- `large-passport.jpg` - Large file size image for compression testing
- `test.txt` - Invalid file type for error testing

### Admin Testing
- `admin-auth.json` - Admin authentication state for admin tests

## Creating Test Fixtures

1. Use royalty-free or generated test images
2. Ensure no real personal information is included
3. Images should be realistic enough to pass basic validation
4. Keep file sizes reasonable (< 1MB for most tests)

## Example Generation

You can generate test fixtures using:

```bash
# Create a simple test image with ImageMagick
convert -size 800x600 xc:white -pointsize 72 -draw "text 100,300 'TEST PASSPORT'" passport-front.jpg

# Create a PDF with text
echo "TEST UTILITY BILL" | ps2pdf - utility-bill.pdf
```

## Security Note

Never commit real identity documents or personal information to the repository.