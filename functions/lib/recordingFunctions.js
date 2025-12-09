"use strict";
/**
 * Firebase Functions for Stream Recording
 * Handles cloud recording, video processing, and storage management
 */
var _a, _b, _c, _d;
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanupOldRecordings = exports.processRecordingHighlight = exports.processRecording = exports.stopCloudRecording = exports.startCloudRecording = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const storage_1 = require("@google-cloud/storage");
const axios_1 = require("axios");
const db = admin.firestore();
const storage = new storage_1.Storage();
// Agora Cloud Recording Configuration
const AGORA_APP_ID = (_a = functions.config().agora) === null || _a === void 0 ? void 0 : _a.app_id;
const AGORA_APP_CERTIFICATE = (_b = functions.config().agora) === null || _b === void 0 ? void 0 : _b.app_certificate;
const AGORA_CUSTOMER_ID = (_c = functions.config().agora) === null || _c === void 0 ? void 0 : _c.customer_id;
const AGORA_CUSTOMER_SECRET = (_d = functions.config().agora) === null || _d === void 0 ? void 0 : _d.customer_secret;
const AGORA_CLOUD_RECORDING_URL = 'https://api.agora.io/v1/apps';
const isAgoraConfigured = !!(AGORA_APP_ID && AGORA_APP_CERTIFICATE && AGORA_CUSTOMER_ID && AGORA_CUSTOMER_SECRET);
function assertAgoraConfigured() {
    if (!isAgoraConfigured) {
        throw new functions.https.HttpsError('failed-precondition', 'Agora recording is not configured. Please set functions.config().agora.{app_id,app_certificate,customer_id,customer_secret}.');
    }
}
/**
 * Start Agora cloud recording
 */
exports.startCloudRecording = functions.https.onCall(async (data, context) => {
    try {
        assertAgoraConfigured();
        // Verify user is authenticated
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
        }
        const { streamId, recordingId, quality } = data;
        if (!streamId || !recordingId) {
            throw new functions.https.HttpsError('invalid-argument', 'streamId and recordingId are required');
        }
        // Verify user has permission to record this stream
        const streamDoc = await db.doc(`streams/${streamId}`).get();
        if (!streamDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Stream not found');
        }
        const streamData = streamDoc.data();
        if (streamData.hostId !== context.auth.uid) {
            throw new functions.https.HttpsError('permission-denied', 'Only the host can start recording');
        }
        // Get Agora credentials
        const agoraToken = await generateAgoraToken(streamId, 0, 'publisher');
        // Configure recording settings based on quality
        const recordingConfig = getRecordingConfig(quality);
        // Start cloud recording via Agora API
        const recordingResponse = await startAgoraRecording(streamId, agoraToken, recordingConfig);
        // Update recording document with Agora resource ID
        await db.doc(`streamRecordings/${recordingId}`).update({
            agoraResourceId: recordingResponse.resourceId,
            agoraRecordingId: recordingResponse.sid,
            status: 'recording',
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log(`Cloud recording started for stream ${streamId}`);
        return {
            success: true,
            resourceId: recordingResponse.resourceId,
            recordingId: recordingResponse.sid
        };
    }
    catch (error) {
        console.error('Error starting cloud recording:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', 'Failed to start cloud recording');
    }
});
/**
 * Stop Agora cloud recording
 */
exports.stopCloudRecording = functions.https.onCall(async (data, context) => {
    var _a, _b;
    try {
        assertAgoraConfigured();
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
        }
        const { streamId, recordingId } = data;
        if (!streamId || !recordingId) {
            throw new functions.https.HttpsError('invalid-argument', 'streamId and recordingId are required');
        }
        // Get recording data
        const recordingDoc = await db.doc(`streamRecordings/${recordingId}`).get();
        if (!recordingDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Recording not found');
        }
        const recordingData = recordingDoc.data();
        // Verify user has permission
        if (recordingData.hostId !== context.auth.uid) {
            throw new functions.https.HttpsError('permission-denied', 'Only the host can stop recording');
        }
        // Stop cloud recording via Agora API
        const stopResponse = await stopAgoraRecording(streamId, recordingData.agoraResourceId, recordingData.agoraRecordingId);
        // Update recording document
        await db.doc(`streamRecordings/${recordingId}`).update({
            status: 'processing',
            recordingEndedAt: admin.firestore.FieldValue.serverTimestamp(),
            processingStartedAt: admin.firestore.FieldValue.serverTimestamp(),
            agoraFileList: ((_a = stopResponse.serverResponse) === null || _a === void 0 ? void 0 : _a.fileList) || [],
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log(`Cloud recording stopped for stream ${streamId}`);
        return {
            success: true,
            fileList: ((_b = stopResponse.serverResponse) === null || _b === void 0 ? void 0 : _b.fileList) || []
        };
    }
    catch (error) {
        console.error('Error stopping cloud recording:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', 'Failed to stop cloud recording');
    }
});
/**
 * Process recording after it's completed
 */
exports.processRecording = functions.firestore
    .document('streamRecordings/{recordingId}')
    .onUpdate(async (change, context) => {
    const { recordingId } = context.params;
    try {
        const beforeData = change.before.data();
        const afterData = change.after.data();
        // Check if recording just finished
        if (beforeData.status === 'recording' && afterData.status === 'processing') {
            console.log(`Processing recording ${recordingId}`);
            // Download and process recording files
            await downloadAndProcessRecording(recordingId, afterData);
        }
    }
    catch (error) {
        console.error('Error processing recording:', error);
        // Update recording status to failed
        await db.doc(`streamRecordings/${recordingId}`).update({
            status: 'failed',
            error: error.message,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
    }
});
/**
 * Process recording highlight
 */
exports.processRecordingHighlight = functions.https.onCall(async (data, context) => {
    try {
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
        }
        const { recordingId, highlightId, startTime, endTime } = data;
        if (!recordingId || !highlightId || startTime === undefined || endTime === undefined) {
            throw new functions.https.HttpsError('invalid-argument', 'recordingId, highlightId, startTime, and endTime are required');
        }
        // Get recording data
        const recordingDoc = await db.doc(`streamRecordings/${recordingId}`).get();
        if (!recordingDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Recording not found');
        }
        const recordingData = recordingDoc.data();
        // Verify user has permission
        if (recordingData.hostId !== context.auth.uid) {
            throw new functions.https.HttpsError('permission-denied', 'Only the recording owner can create highlights');
        }
        // Process highlight video
        const highlightUrl = await createHighlightVideo(recordingData.videoUrl, startTime, endTime, `${recordingId}/${highlightId}`);
        // Update highlight document
        await db.doc(`streamRecordings/${recordingId}/highlights/${highlightId}`).update({
            videoUrl: highlightUrl,
            status: 'ready',
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log(`Highlight processed: ${highlightId}`);
        return {
            success: true,
            videoUrl: highlightUrl
        };
    }
    catch (error) {
        console.error('Error processing highlight:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', 'Failed to process highlight');
    }
});
/**
 * Clean up old recordings
 */
exports.cleanupOldRecordings = functions.pubsub
    .schedule('every 24 hours')
    .onRun(async (context) => {
    var _a;
    try {
        const thirtyDaysAgo = admin.firestore.Timestamp.fromMillis(Date.now() - 30 * 24 * 60 * 60 * 1000);
        // Find old recordings marked for deletion
        const oldRecordingsQuery = await db.collection('streamRecordings')
            .where('status', '==', 'deleted')
            .where('updatedAt', '<', thirtyDaysAgo)
            .limit(100)
            .get();
        const batch = db.batch();
        let deletedCount = 0;
        const bucketName = ((_a = functions.config().storage) === null || _a === void 0 ? void 0 : _a.bucket) || process.env.GCLOUD_STORAGE_BUCKET || 'default-bucket';
        const bucket = storage.bucket(bucketName);
        for (const doc of oldRecordingsQuery.docs) {
            const recordingData = doc.data();
            // Delete video files from storage
            if (recordingData.videoUrl) {
                try {
                    await bucket.file(recordingData.videoUrl).delete();
                }
                catch (error) {
                    console.warn(`Failed to delete video file: ${recordingData.videoUrl}`, error);
                }
            }
            if (recordingData.thumbnailUrl) {
                try {
                    await bucket.file(recordingData.thumbnailUrl).delete();
                }
                catch (error) {
                    console.warn(`Failed to delete thumbnail file: ${recordingData.thumbnailUrl}`, error);
                }
            }
            // Delete recording document
            batch.delete(doc.ref);
            deletedCount++;
        }
        if (deletedCount > 0) {
            await batch.commit();
            console.log(`Cleaned up ${deletedCount} old recordings`);
        }
        return { deletedRecordings: deletedCount };
    }
    catch (error) {
        console.error('Error cleaning up old recordings:', error);
        throw error;
    }
});
/**
 * Generate Agora token for recording
 */
async function generateAgoraToken(channelName, uid, role) {
    // This would use the Agora token generation logic
    // For now, return a placeholder
    return 'agora_token_placeholder';
}
/**
 * Get recording configuration based on quality
 */
function getRecordingConfig(quality) {
    var _a, _b, _c;
    const baseConfig = {
        recordingConfig: {
            channelType: 0,
            streamTypes: 2,
            audioProfile: 1,
            videoStreamType: 0,
            maxIdleTime: 30,
            transcodingConfig: {
                width: 640,
                height: 360,
                fps: 15,
                bitrate: 500,
                maxResolutionUid: '1',
                mixedVideoLayout: 1
            }
        },
        storageConfig: {
            vendor: 1,
            region: 0,
            bucket: ((_a = functions.config().storage) === null || _a === void 0 ? void 0 : _a.bucket) || 'default-bucket',
            accessKey: (_b = functions.config().storage) === null || _b === void 0 ? void 0 : _b.access_key,
            secretKey: (_c = functions.config().storage) === null || _c === void 0 ? void 0 : _c.secret_key
        }
    };
    // Adjust quality settings
    switch (quality) {
        case 'high':
            baseConfig.recordingConfig.transcodingConfig.width = 1280;
            baseConfig.recordingConfig.transcodingConfig.height = 720;
            baseConfig.recordingConfig.transcodingConfig.fps = 30;
            baseConfig.recordingConfig.transcodingConfig.bitrate = 2000;
            break;
        case 'low':
            baseConfig.recordingConfig.transcodingConfig.width = 480;
            baseConfig.recordingConfig.transcodingConfig.height = 270;
            baseConfig.recordingConfig.transcodingConfig.fps = 15;
            baseConfig.recordingConfig.transcodingConfig.bitrate = 300;
            break;
        default: // medium
            // Use base config
            break;
    }
    return baseConfig;
}
/**
 * Start Agora recording via API
 */
async function startAgoraRecording(channelName, token, config) {
    try {
        // First, acquire resource
        const acquireResponse = await axios_1.default.post(`${AGORA_CLOUD_RECORDING_URL}/${AGORA_APP_ID}/cloud_recording/acquire`, {
            cname: channelName,
            uid: '0',
            clientRequest: {
                resourceExpiredHour: 24
            }
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${Buffer.from(`${AGORA_CUSTOMER_ID}:${AGORA_CUSTOMER_SECRET}`).toString('base64')}`
            }
        });
        const resourceId = acquireResponse.data.resourceId;
        // Then, start recording
        const startResponse = await axios_1.default.post(`${AGORA_CLOUD_RECORDING_URL}/${AGORA_APP_ID}/cloud_recording/resourceid/${resourceId}/mode/mix/start`, {
            cname: channelName,
            uid: '0',
            clientRequest: Object.assign({ token }, config)
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${Buffer.from(`${AGORA_CUSTOMER_ID}:${AGORA_CUSTOMER_SECRET}`).toString('base64')}`
            }
        });
        return {
            resourceId,
            sid: startResponse.data.sid
        };
    }
    catch (error) {
        console.error('Error starting Agora recording:', error);
        throw error;
    }
}
/**
 * Stop Agora recording via API
 */
async function stopAgoraRecording(channelName, resourceId, sid) {
    try {
        const response = await axios_1.default.post(`${AGORA_CLOUD_RECORDING_URL}/${AGORA_APP_ID}/cloud_recording/resourceid/${resourceId}/sid/${sid}/mode/mix/stop`, {
            cname: channelName,
            uid: '0',
            clientRequest: {}
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${Buffer.from(`${AGORA_CUSTOMER_ID}:${AGORA_CUSTOMER_SECRET}`).toString('base64')}`
            }
        });
        return response.data;
    }
    catch (error) {
        console.error('Error stopping Agora recording:', error);
        throw error;
    }
}
/**
 * Download and process recording files
 */
async function downloadAndProcessRecording(recordingId, recordingData) {
    try {
        // This would download the recording files from Agora's storage
        // and upload them to Firebase Storage
        // For now, simulate the process
        const videoUrl = `recordings/${recordingId}/video.mp4`;
        const thumbnailUrl = `recordings/${recordingId}/thumbnail.jpg`;
        // Update recording document with processed URLs
        await db.doc(`streamRecordings/${recordingId}`).update({
            status: 'ready',
            videoUrl,
            thumbnailUrl,
            fileSize: 1024 * 1024 * 50,
            processingCompletedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log(`Recording processed successfully: ${recordingId}`);
    }
    catch (error) {
        console.error('Error processing recording files:', error);
        throw error;
    }
}
/**
 * Create highlight video from main recording
 */
async function createHighlightVideo(sourceVideoUrl, startTime, endTime, outputPath) {
    try {
        // This would use video processing tools like FFmpeg
        // to extract the highlight segment from the main video
        // For now, return a placeholder URL
        const highlightUrl = `highlights/${outputPath}.mp4`;
        console.log(`Highlight video created: ${highlightUrl}`);
        return highlightUrl;
    }
    catch (error) {
        console.error('Error creating highlight video:', error);
        throw error;
    }
}
//# sourceMappingURL=recordingFunctions.js.map