const { S3Client, PutObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const { v4: uuidv4 } = require("uuid");

const s3 = new S3Client({ region: process.env.AWS_REGION });

const uploadFileToS3 = async (fileBuffer, mimetype, originalName) => {
  const key = `uploads/${uuidv4()}-${originalName.replace(/\s+/g, "_")}`;
  await s3.send(
    new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key,
      Body: fileBuffer,
      ContentType: mimetype,
    })
  );
  return `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
};

const deleteFileFromS3 = async (fileUrl) => {
  const key = fileUrl.split(".amazonaws.com/")[1];
  if (!key) return;
  await s3.send(new DeleteObjectCommand({ Bucket: process.env.AWS_S3_BUCKET, Key: key }));
};

module.exports = { uploadFileToS3, deleteFileFromS3 };
