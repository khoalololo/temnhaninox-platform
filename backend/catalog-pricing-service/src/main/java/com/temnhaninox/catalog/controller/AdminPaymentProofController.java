package com.temnhaninox.catalog.controller;

import com.temnhaninox.catalog.service.S3StorageService;
import com.temnhaninox.common.enums.UserRole;
import com.temnhaninox.common.exception.BusinessException;
import com.temnhaninox.common.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;
import software.amazon.awssdk.core.ResponseInputStream;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;

import java.io.IOException;
import java.util.Locale;
import java.util.Set;

@RestController
@RequestMapping("/api/v1/admin/files/payment-proofs")
@RequiredArgsConstructor
public class AdminPaymentProofController {

    private static final Set<String> INLINE_IMAGE_TYPES = Set.of("image/png", "image/jpeg", "image/webp");
    private static final Set<String> SAFE_CONTENT_TYPES = Set.of(
            "image/png", "image/jpeg", "image/webp", "application/pdf"
    );

    private final S3StorageService s3StorageService;

    @GetMapping("/{key}")
    public ResponseEntity<StreamingResponseBody> getPaymentProof(
            @RequestHeader(value = "X-User-Role", required = false) String role,
            @PathVariable String key) {
        if (!UserRole.ADMIN.name().equalsIgnoreCase(role)) {
            throw new BusinessException(ErrorCode.FORBIDDEN, "Admin privileges required");
        }

        ResponseInputStream<GetObjectResponse> object = s3StorageService.getPaymentProof(key);
        String metadataContentType = object.response().contentType();
        String normalizedContentType = metadataContentType == null
                ? ""
                : metadataContentType.split(";", 2)[0].trim().toLowerCase(Locale.ROOT);
        String contentType = SAFE_CONTENT_TYPES.contains(normalizedContentType)
                ? normalizedContentType
                : MediaType.APPLICATION_OCTET_STREAM_VALUE;
        ContentDisposition disposition = INLINE_IMAGE_TYPES.contains(normalizedContentType)
                ? ContentDisposition.inline().filename(key).build()
                : ContentDisposition.attachment().filename(key).build();

        StreamingResponseBody body = outputStream -> {
            try (object) {
                object.transferTo(outputStream);
            } catch (IOException ex) {
                throw new IllegalStateException("Failed to stream payment proof", ex);
            }
        };

        ResponseEntity.BodyBuilder response = ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
                .header("X-Content-Type-Options", "nosniff")
                .contentType(MediaType.parseMediaType(contentType));
        Long contentLength = object.response().contentLength();
        if (contentLength != null && contentLength >= 0) {
            response.contentLength(contentLength);
        }
        return response.body(body);
    }
}
