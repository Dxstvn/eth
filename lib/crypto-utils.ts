export async function generateKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"])
}

export async function encryptFile(file: File, key: CryptoKey): Promise<Blob> {
  const fileBuffer = await file.arrayBuffer()
  const iv = crypto.getRandomValues(new Uint8Array(12))

  // Encrypt the file content
  const encryptedBuffer = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, fileBuffer)

  // Combine IV and encrypted data into a single blob
  // IV needs to be stored with the encrypted data for decryption later
  const combinedArray = new Uint8Array(iv.length + new Uint8Array(encryptedBuffer).length)
  combinedArray.set(iv, 0)
  combinedArray.set(new Uint8Array(encryptedBuffer), iv.length)

  return new Blob([combinedArray])
}

export async function decryptFile(encryptedBlob: Blob, key: CryptoKey): Promise<Blob> {
  const encryptedBuffer = await encryptedBlob.arrayBuffer()
  const encryptedArray = new Uint8Array(encryptedBuffer)

  // Extract IV (first 12 bytes)
  const iv = encryptedArray.slice(0, 12)
  // Extract encrypted data (remaining bytes)
  const encryptedData = encryptedArray.slice(12)

  // Decrypt the data
  const decryptedBuffer = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, encryptedData)

  return new Blob([decryptedBuffer])
}

export async function exportKey(key: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey("raw", key)
  return Array.from(new Uint8Array(exported))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

export async function importKey(hexKey: string): Promise<CryptoKey> {
  // Convert hex string back to byte array
  const keyBytes = new Uint8Array(hexKey.match(/.{1,2}/g)?.map((byte) => Number.parseInt(byte, 16)) || [])

  // Import the key
  return crypto.subtle.importKey("raw", keyBytes, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"])
}
