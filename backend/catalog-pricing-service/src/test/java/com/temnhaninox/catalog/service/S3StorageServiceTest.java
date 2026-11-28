package com.temnhaninox.catalog.service;

import com.temnhaninox.catalog.dto.FileUploadResponse;
import com.temnhaninox.common.exception.BusinessException;
import com.temnhaninox.common.exception.ErrorCode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.core.ResponseInputStream;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.CreateBucketRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;
import software.amazon.awssdk.services.s3.model.HeadBucketRequest;
import software.amazon.awssdk.services.s3.model.NoSuchBucketException;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class S3StorageServiceTest {

    @Mock
    private S3Client s3Client;

    @Mock
    private ResponseInputStream<GetObjectResponse> paymentProofObject;

    private S3StorageService s3StorageService;

    @BeforeEach
    void setUp() {
        s3StorageService = new S3StorageService(s3Client);
        ReflectionTestUtils.setField(s3StorageService, "publicUrl", "http://localhost:9000");
    }

    @Test
    void uploadFile_createsMissingBucketAndUploadsObject() {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "nameplate-design.pdf",
                "application/pdf",
                "PDF-CONTENT".getBytes()
        );
        when(s3Client.headBucket(any(HeadBucketRequest.class)))
                .thenThrow(NoSuchBucketException.builder().message("missing").build());

        FileUploadResponse response = s3StorageService.uploadFile(file, "design-files");

        verify(s3Client).createBucket(any(CreateBucketRequest.class));
        verify(s3Client).putObject(any(PutObjectRequest.class), any(RequestBody.class));
        assertThat(response.getBucket()).isEqualTo("design-files");
        assertThat(response.getFileName()).isEqualTo("nameplate-design.pdf");
        assertThat(response.getUrl()).startsWith("http://localhost:9000/design-files/");
        assertThat(response.getUrl()).endsWith("-nameplate-design.pdf");
    }

    @Test
    void uploadFile_acceptsWebpPrototypeImage() {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "prototype.webp",
                "image/webp",
                "WEBP-CONTENT".getBytes()
        );
        when(s3Client.headBucket(any(HeadBucketRequest.class))).thenReturn(null);

        FileUploadResponse response = s3StorageService.uploadFile(file, "prototypes");

        verify(s3Client).putObject(any(PutObjectRequest.class), any(RequestBody.class));
        assertThat(response.getBucket()).isEqualTo("prototypes");
        assertThat(response.getFileName()).isEqualTo("prototype.webp");
    }

    @Test
    void uploadFile_rejectsUnsupportedExtension() {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "malware.exe",
                "application/octet-stream",
                "MZ".getBytes()
        );

        assertThatThrownBy(() -> s3StorageService.uploadFile(file, "design-files"))
                .isInstanceOf(BusinessException.class)
                .extracting(ex -> ((BusinessException) ex).getErrorCode())
                .isEqualTo(ErrorCode.FILE_UPLOAD_ERROR);
    }

    @Test
    void uploadFile_rejectsDisallowedBucket() {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "logo.png",
                "image/png",
                "PNG".getBytes()
        );

        assertThatThrownBy(() -> s3StorageService.uploadFile(file, "random-bucket"))
                .isInstanceOf(BusinessException.class)
                .extracting(ex -> ((BusinessException) ex).getErrorCode())
                .isEqualTo(ErrorCode.FILE_UPLOAD_ERROR);
    }

    @Test
    void getPaymentProof_readsOnlyFromPaymentProofBucket() {
        when(s3Client.getObject(any(GetObjectRequest.class))).thenReturn(paymentProofObject);

        assertThat(s3StorageService.getPaymentProof("ef610cfe-c022-4257-ae85-f1a0c9378e03-receipt.png"))
                .isSameAs(paymentProofObject);

        verify(s3Client).getObject(org.mockito.ArgumentMatchers.argThat(request ->
                request.bucket().equals("payment-proofs")
                        && request.key().equals("ef610cfe-c022-4257-ae85-f1a0c9378e03-receipt.png")));
    }

    @Test
    void getPaymentProof_rejectsPathSeparators() {
        assertThatThrownBy(() -> s3StorageService.getPaymentProof("../receipt.png"))
                .isInstanceOf(BusinessException.class)
                .extracting(ex -> ((BusinessException) ex).getErrorCode())
                .isEqualTo(ErrorCode.VALIDATION_ERROR);
    }
}
