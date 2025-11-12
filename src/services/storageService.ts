/**
 * Storage Service
 * Handles file uploads to Firebase Storage
 */

import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from './firebase';
import FirebaseErrorHandler from '../utils/firebaseErrorHandler';

export interface UploadProgress {
  bytesTransferred: number;
  totalBytes: number;
  progress: number;
}

class StorageService {
  /**
   * Upload a photo to Firebase Storage
   */
  async uploadPhoto(
    uri: string,
    userId: string,
    photoId: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<string> {
    try {
      // Fetch the image from the local URI
      const response = await fetch(uri);
      const blob = await response.blob();

      // Create a reference to the storage location
      const fileName = `${photoId}_${Date.now()}.jpg`;
      const storageRef = ref(storage, `users/${userId}/photos/${fileName}`);

      // Simulate progress updates
      if (onProgress) {
        const totalBytes = blob.size;
        let bytesTransferred = 0;
        
        const progressInterval = setInterval(() => {
          bytesTransferred = Math.min(bytesTransferred + totalBytes * 0.1, totalBytes);
          onProgress({
            bytesTransferred,
            totalBytes,
            progress: (bytesTransferred / totalBytes) * 100
          });
          
          if (bytesTransferred >= totalBytes) {
            clearInterval(progressInterval);
          }
        }, 100);
      }

      // Upload the blob
      await uploadBytes(storageRef, blob);

      // Get the download URL
      const downloadURL = await getDownloadURL(storageRef);

      console.log(`✅ Photo uploaded successfully: ${downloadURL}`);
      return downloadURL;
    } catch (error: any) {
      console.error('Failed to upload photo:', error);
      FirebaseErrorHandler.logError('uploadPhoto', error);
      throw new Error(`Failed to upload photo: ${error.message}`);
    }
  }

  /**
   * Delete a photo from Firebase Storage
   */
  async deletePhoto(photoUrl: string): Promise<void> {
    try {
      // Extract the storage path from the URL
      const storageRef = ref(storage, photoUrl);
      await deleteObject(storageRef);
      console.log(`✅ Photo deleted successfully: ${photoUrl}`);
    } catch (error: any) {
      console.error('Failed to delete photo:', error);
      FirebaseErrorHandler.logError('deletePhoto', error);
      throw new Error(`Failed to delete photo: ${error.message}`);
    }
  }

  /**
   * Upload profile avatar
   */
  async uploadAvatar(
    uri: string,
    userId: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<string> {
    try {
      // Fetch the image from the local URI
      const response = await fetch(uri);
      const blob = await response.blob();

      // Create a reference to the storage location
      const fileName = `avatar_${Date.now()}.jpg`;
      const storageRef = ref(storage, `users/${userId}/avatar/${fileName}`);

      // Simulate progress updates
      if (onProgress) {
        const totalBytes = blob.size;
        let bytesTransferred = 0;
        
        const progressInterval = setInterval(() => {
          bytesTransferred = Math.min(bytesTransferred + totalBytes * 0.1, totalBytes);
          onProgress({
            bytesTransferred,
            totalBytes,
            progress: (bytesTransferred / totalBytes) * 100
          });
          
          if (bytesTransferred >= totalBytes) {
            clearInterval(progressInterval);
          }
        }, 100);
      }

      // Upload the blob
      await uploadBytes(storageRef, blob);

      // Get the download URL
      const downloadURL = await getDownloadURL(storageRef);

      console.log(`✅ Avatar uploaded successfully: ${downloadURL}`);
      return downloadURL;
    } catch (error: any) {
      console.error('Failed to upload avatar:', error);
      FirebaseErrorHandler.logError('uploadAvatar', error);
      throw new Error(`Failed to upload avatar: ${error.message}`);
    }
  }

  /**
   * Upload attachment (generic file upload)
   */
  async uploadAttachment(
    uri: string,
    fileName: string,
    mimeType: string,
    userId: string,
    conversationId: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<string> {
    try {
      // Fetch the file from the local URI
      const response = await fetch(uri);
      const blob = await response.blob();

      // Create a reference to the storage location
      const timestamp = Date.now();
      const storageRef = ref(storage, `conversations/${conversationId}/attachments/${timestamp}_${fileName}`);

      // Simulate progress updates
      if (onProgress) {
        const totalBytes = blob.size;
        let bytesTransferred = 0;
        
        const progressInterval = setInterval(() => {
          bytesTransferred = Math.min(bytesTransferred + totalBytes * 0.1, totalBytes);
          onProgress({
            bytesTransferred,
            totalBytes,
            progress: (bytesTransferred / totalBytes) * 100
          });
          
          if (bytesTransferred >= totalBytes) {
            clearInterval(progressInterval);
          }
        }, 100);
      }

      // Upload the blob
      await uploadBytes(storageRef, blob);

      // Get the download URL
      const downloadURL = await getDownloadURL(storageRef);

      console.log(`✅ Attachment uploaded successfully: ${downloadURL}`);
      return downloadURL;
    } catch (error: any) {
      console.error('Failed to upload attachment:', error);
      FirebaseErrorHandler.logError('uploadAttachment', error);
      throw new Error(`Failed to upload attachment: ${error.message}`);
    }
  }
}

export const storageService = new StorageService();
export default storageService;

