import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

/**
 * Upload a file to S3
 * @param {Buffer} fileBuffer - The file content
 * @param {string} fileName - The name of the file
 * @param {string} mimeType - The MIME type of the file
 * @returns {Promise<string>} - The S3 URL of the uploaded file
 */

export const uploadToS3 = async (fileBuffer, fileName, mimeType) => {
  const params = {
    Bucket: process.env.AWS_S3_BUCKET_NAME,
    Key: `las-files/${Date.now()}-${fileName}`,
    Body: fileBuffer,
    ContentType: mimeType,
  };

  try {
    await s3Client.send(new PutObjectCommand(params));
    const fileUrl = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${params.Key}`;
    return fileUrl;
  } catch (error) {
    console.error("Error uploading to S3:", error);
    throw new Error("Failed to upload file to S3");
  }
};

/**
 * Delete a file from S3
 * @param {string} s3Url - The S3 URL of the file
 * @returns {Promise<void>}
 */
export const deleteFromS3 = async (s3Url) => {
  try {
    // Extract the key from the URL
    const url = new URL(s3Url);
    const key = url.pathname.substring(1); // Remove leading slash

    const params = {
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: key,
    };

    await s3Client.send(new DeleteObjectCommand(params));
  } catch (error) {
    console.error("Error deleting from S3:", error);
    throw new Error("Failed to delete file from S3");
  }
};

/**
 * Get a signed URL for accessing a file in S3
 * @param {string} s3Url - The S3 URL of the file
 * @param {number} expirationSeconds - URL expiration time in seconds (default: 3600)
 * @returns {Promise<string>} - Signed URL
 */
export const getSignedS3Url = async (s3Url, expirationSeconds = 3600) => {
  try {
    const url = new URL(s3Url);
    const key = url.pathname.substring(1);

    const params = {
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: key,
    };

    const signedUrl = await getSignedUrl(
      s3Client,
      new GetObjectCommand(params),
      { expiresIn: expirationSeconds }
    );

    return signedUrl;
  } catch (error) {
    console.error("Error generating signed URL:", error);
    throw new Error("Failed to generate signed URL");
  }
};

export default s3Client;
