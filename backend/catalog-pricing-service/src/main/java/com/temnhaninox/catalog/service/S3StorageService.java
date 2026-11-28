package com.temnhaninox.catalog.service;

import com.temnhaninox.catalog.dto.FileUploadResponse;
import com.temnhaninox.common.exception.BusinessException;
import com.temnhaninox.common.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.core.ResponseInputStream;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.CreateBucketRequest;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.HeadBucketRequest;
import software.amazon.awssdk.services.s3.model.NoSuchBucketException;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.S3Exception;

import java.io.IOException;
import java.util.Set;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class S3StorageService {

    private static final long MAX_FILE_SIZE_BYTES = 50L * 1024 * 1024;
    private static final Set<String> ALLOWED_BUCKETS = Set.of(
            "design-files", "product-images", "prototypes", "payment-proofs"
    );
    private static final Set<String> ALLOWED_EXTENSIONS = Set.of(
            "cdr", "ai", "pdf", "svg", "png", "jpg", "jpeg", "webp"
    );

    private final S3Client s3Client;

    @Value("${app.s3.public-url:http://localhost:9000}")
    private String publicUrl;

    public FileUploadResponse uploadFile(MultipartFile file, String bucket) {
        String normalizedBucket = bucket != null ? bucket.trim().toLowerCase() : "design-files";
        if (!ALLOWED_BUCKETS.contains(normalizedBucket)) {
            throw new BusinessException(ErrorCode.FILE_UPLOAD_ERROR,
                    "Invalid bucket. Allowed buckets: design-files, product-images, prototypes, payment-proofs");
        }

        if (file == null || file.isEmpty()) {
            throw new BusinessException(ErrorCode.FILE_UPLOAD_ERROR, "Uploaded file must not be empty");
        }

        if (file.getSize() > MAX_FILE_SIZE_BYTES) {
            throw new BusinessException(ErrorCode.FILE_UPLOAD_ERROR, "File size exceeds maximum limit of 50MB");
        }

        String originalFilename = StringUtils.cleanPath(
                file.getOriginalFilename() != null ? file.getOriginalFilename() : "upload"
        );
        String extension = extractExtension(originalFilename);
        if (!ALLOWED_EXTENSIONS.contains(extension)) {
            throw new BusinessException(ErrorCode.FILE_UPLOAD_ERROR,
                    "Unsupported file format '." + extension + "'. Allowed: .cdr, .ai, .pdf, .svg, .png, .jpg, .jpeg, .webp");
        }

        ensureBucketExists(normalizedBucket);

        String sanitizedFilename = originalFilename.replaceAll("[^a-zA-Z0-9._-]", "_");
        String objectKey = UUID.randomUUID() + "-" + sanitizedFilename;
        String contentType = file.getContentType() != null ? file.getContentType() : "application/octet-stream";

        try {
            PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                    .bucket(normalizedBucket)
                    .key(objectKey)
                    .contentType(contentType)
                    .contentLength(file.getSize())
                    .build();

            s3Client.putObject(putObjectRequest, RequestBody.fromInputStream(file.getInputStream(), file.getSize()));
        } catch (IOException ex) {
            log.error("Failed to read multipart stream for upload", ex);
            throw new BusinessException(ErrorCode.FILE_UPLOAD_ERROR, "Failed to read uploaded file");
        } catch (Exception ex) {
            log.error("Failed to upload file to SeaweedFS S3 bucket {}", normalizedBucket, ex);
            throw new BusinessException(ErrorCode.FILE_UPLOAD_ERROR, "Object storage upload failed: " + ex.getMessage());
        }

        String baseUrl = publicUrl.endsWith("/") ? publicUrl.substring(0, publicUrl.length() - 1) : publicUrl;
        String url = baseUrl + "/" + normalizedBucket + "/" + objectKey;

        return FileUploadResponse.builder()
                .bucket(normalizedBucket)
                .key(objectKey)
                .fileName(originalFilename)
                .contentType(contentType)
                .size(file.getSize())
                .url(url)
                .build();
    }

    public ResponseInputStream<GetObjectResponse> getPaymentProof(String key) {
        if (!StringUtils.hasText(key) || !key.matches("[A-Za-z0-9._-]+")) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "Invalid payment proof key");
        }

        try {
            return s3Client.getObject(GetObjectRequest.builder()
                    .bucket("payment-proofs")
                    .key(key)
                    .build());
        } catch (S3Exception ex) {
            if (ex.statusCode() == 404) {
                throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "Payment proof not found");
            }
            throw ex;
        }
    }

    private void ensureBucketExists(String bucket) {
        try {
            s3Client.headBucket(HeadBucketRequest.builder().bucket(bucket).build());
        } catch (NoSuchBucketException ex) {
            log.info("Creating missing S3 bucket: {}", bucket);
            s3Client.createBucket(CreateBucketRequest.builder().bucket(bucket).build());
        }
    }

    private String extractExtension(String filename) {
        int lastDot = filename.lastIndexOf('.');
        if (lastDot < 0 || lastDot == filename.length() - 1) {
            return "";
        }
        return filename.substring(lastDot + 1).toLowerCase();
    }
}
