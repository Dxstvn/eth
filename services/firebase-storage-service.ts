import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  getMetadata,
  listAll,
  UploadTaskSnapshot,
  StorageReference,
  UploadTask,
} from 'firebase/storage'
import { storage } from '@/lib/firebase-client'

export interface UploadProgress {
  bytesTransferred: number
  totalBytes: number
  progress: number
  state: 'running' | 'paused' | 'success' | 'canceled' | 'error'
}

export interface FileMetadata {
  name: string
  fullPath: string
  size: number
  timeCreated: string
  updated: string
  contentType?: string
  downloadURL?: string
  customMetadata?: Record<string, string>
}

export interface UploadOptions {
  onProgress?: (progress: UploadProgress) => void
  onComplete?: (downloadURL: string, metadata: FileMetadata) => void
  onError?: (error: Error) => void
  customMetadata?: Record<string, string>
  contentType?: string
}

class FirebaseStorageService {
  private uploadTasks = new Map<string, UploadTask>()

  /**
   * Upload a file to Firebase Storage with progress tracking
   */
  async uploadFile(
    file: File,
    path: string,
    options: UploadOptions = {}
  ): Promise<{ downloadURL: string; metadata: FileMetadata; taskId: string }> {
    if (!storage) {
      throw new Error('Firebase Storage is not configured')
    }

    const {
      onProgress,
      onComplete,
      onError,
      customMetadata = {},
      contentType = file.type
    } = options

    // Generate unique task ID
    const taskId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    // Create storage reference
    const storageRef = ref(storage, path)
    
    // Create upload task with metadata
    const uploadTask = uploadBytesResumable(storageRef, file, {
      contentType,
      customMetadata: {
        ...customMetadata,
        originalName: file.name,
        uploadedAt: new Date().toISOString(),
        taskId,
      }
    })

    // Store task for potential cancellation
    this.uploadTasks.set(taskId, uploadTask)

    return new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot: UploadTaskSnapshot) => {
          const progress: UploadProgress = {
            bytesTransferred: snapshot.bytesTransferred,
            totalBytes: snapshot.totalBytes,
            progress: (snapshot.bytesTransferred / snapshot.totalBytes) * 100,
            state: snapshot.state as any
          }

          onProgress?.(progress)
        },
        (error) => {
          console.error('Upload error:', error)
          this.uploadTasks.delete(taskId)
          onError?.(error)
          reject(error)
        },
        async () => {
          try {
            // Upload completed successfully
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref)
            const metadata = await this.getFileMetadata(path)
            
            this.uploadTasks.delete(taskId)
            
            const result = {
              downloadURL,
              metadata: { ...metadata, downloadURL },
              taskId
            }

            onComplete?.(downloadURL, result.metadata)
            resolve(result)
          } catch (error) {
            this.uploadTasks.delete(taskId)
            reject(error)
          }
        }
      )
    })
  }

  /**
   * Upload multiple files with progress tracking
   */
  async uploadFiles(
    files: File[],
    pathGenerator: (file: File, index: number) => string,
    options: Omit<UploadOptions, 'onProgress'> & {
      onFileProgress?: (fileIndex: number, progress: UploadProgress) => void
      onOverallProgress?: (completedFiles: number, totalFiles: number, overallProgress: number) => void
    } = {}
  ): Promise<Array<{ downloadURL: string; metadata: FileMetadata; file: File }>> {
    const results: Array<{ downloadURL: string; metadata: FileMetadata; file: File }> = []
    const { onFileProgress, onOverallProgress, ...uploadOptions } = options

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const path = pathGenerator(file, i)

      try {
        const result = await this.uploadFile(file, path, {
          ...uploadOptions,
          onProgress: (progress) => onFileProgress?.(i, progress)
        })

        results.push({
          ...result,
          file
        })

        // Update overall progress
        onOverallProgress?.(i + 1, files.length, ((i + 1) / files.length) * 100)
      } catch (error) {
        console.error(`Failed to upload file ${file.name}:`, error)
        throw error
      }
    }

    return results
  }

  /**
   * Download a file and get its URL
   */
  async getDownloadURL(path: string): Promise<string> {
    if (!storage) {
      throw new Error('Firebase Storage is not configured')
    }

    const storageRef = ref(storage, path)
    return await getDownloadURL(storageRef)
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(path: string): Promise<FileMetadata> {
    if (!storage) {
      throw new Error('Firebase Storage is not configured')
    }

    const storageRef = ref(storage, path)
    const metadata = await getMetadata(storageRef)

    return {
      name: metadata.name,
      fullPath: metadata.fullPath,
      size: metadata.size,
      timeCreated: metadata.timeCreated,
      updated: metadata.updated,
      contentType: metadata.contentType,
      customMetadata: metadata.customMetadata
    }
  }

  /**
   * Delete a file from storage
   */
  async deleteFile(path: string): Promise<void> {
    if (!storage) {
      throw new Error('Firebase Storage is not configured')
    }

    const storageRef = ref(storage, path)
    await deleteObject(storageRef)
  }

  /**
   * Delete multiple files
   */
  async deleteFiles(paths: string[]): Promise<void> {
    if (!storage) {
      throw new Error('Firebase Storage is not configured')
    }

    const deletePromises = paths.map(path => this.deleteFile(path))
    await Promise.all(deletePromises)
  }

  /**
   * List files in a directory
   */
  async listFiles(path: string): Promise<FileMetadata[]> {
    if (!storage) {
      throw new Error('Firebase Storage is not configured')
    }

    const storageRef = ref(storage, path)
    const listResult = await listAll(storageRef)

    const metadataPromises = listResult.items.map(async (itemRef) => {
      const metadata = await getMetadata(itemRef)
      const downloadURL = await getDownloadURL(itemRef)

      return {
        name: metadata.name,
        fullPath: metadata.fullPath,
        size: metadata.size,
        timeCreated: metadata.timeCreated,
        updated: metadata.updated,
        contentType: metadata.contentType,
        customMetadata: metadata.customMetadata,
        downloadURL
      }
    })

    return await Promise.all(metadataPromises)
  }

  /**
   * Cancel an ongoing upload
   */
  cancelUpload(taskId: string): boolean {
    const task = this.uploadTasks.get(taskId)
    if (task) {
      task.cancel()
      this.uploadTasks.delete(taskId)
      return true
    }
    return false
  }

  /**
   * Cancel all ongoing uploads
   */
  cancelAllUploads(): void {
    this.uploadTasks.forEach((task) => task.cancel())
    this.uploadTasks.clear()
  }

  /**
   * Get upload progress for a specific task
   */
  getUploadProgress(taskId: string): UploadTaskSnapshot | null {
    const task = this.uploadTasks.get(taskId)
    return task?.snapshot || null
  }

  /**
   * Generate secure file path for transaction documents
   */
  generateTransactionFilePath(
    transactionId: string,
    fileName: string,
    userId: string
  ): string {
    // Sanitize filename
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_')
    const timestamp = Date.now()
    const randomId = Math.random().toString(36).substr(2, 9)
    
    return `transactions/${transactionId}/documents/${userId}/${timestamp}_${randomId}_${sanitizedFileName}`
  }

  /**
   * Generate secure file path for user uploads
   */
  generateUserFilePath(
    userId: string,
    fileName: string,
    category: 'profile' | 'documents' | 'temp' = 'documents'
  ): string {
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_')
    const timestamp = Date.now()
    const randomId = Math.random().toString(36).substr(2, 9)
    
    return `users/${userId}/${category}/${timestamp}_${randomId}_${sanitizedFileName}`
  }

  /**
   * Validate file before upload
   */
  validateFile(
    file: File,
    options: {
      maxSize?: number // in bytes
      allowedTypes?: string[]
      maxFiles?: number
    } = {}
  ): { isValid: boolean; error?: string } {
    const {
      maxSize = 10 * 1024 * 1024, // 10MB default
      allowedTypes = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'application/pdf',
        'text/plain',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ]
    } = options

    if (file.size > maxSize) {
      return {
        isValid: false,
        error: `File size exceeds ${(maxSize / 1024 / 1024).toFixed(1)}MB limit`
      }
    }

    if (!allowedTypes.includes(file.type)) {
      return {
        isValid: false,
        error: `File type ${file.type} is not allowed`
      }
    }

    return { isValid: true }
  }

  /**
   * Get storage usage for a user
   */
  async getUserStorageUsage(userId: string): Promise<{
    totalFiles: number
    totalSize: number
    filesByCategory: Record<string, { count: number; size: number }>
  }> {
    const userFiles = await this.listFiles(`users/${userId}`)
    
    let totalSize = 0
    const filesByCategory: Record<string, { count: number; size: number }> = {}

    userFiles.forEach(file => {
      totalSize += file.size
      
      // Extract category from path
      const pathParts = file.fullPath.split('/')
      const category = pathParts[2] || 'unknown'
      
      if (!filesByCategory[category]) {
        filesByCategory[category] = { count: 0, size: 0 }
      }
      
      filesByCategory[category].count++
      filesByCategory[category].size += file.size
    })

    return {
      totalFiles: userFiles.length,
      totalSize,
      filesByCategory
    }
  }
}

// Export singleton instance
export const firebaseStorageService = new FirebaseStorageService()
export default firebaseStorageService