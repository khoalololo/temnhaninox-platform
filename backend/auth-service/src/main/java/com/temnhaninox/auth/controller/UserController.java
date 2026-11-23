package com.temnhaninox.auth.controller;

import com.temnhaninox.auth.dto.UpdateProfileRequest;
import com.temnhaninox.auth.dto.UserProfileResponse;
import com.temnhaninox.auth.dto.VatProfileRequest;
import com.temnhaninox.auth.dto.VatProfileResponse;
import com.temnhaninox.auth.service.UserProfileService;
import com.temnhaninox.common.dto.ApiResponse;
import com.temnhaninox.common.exception.BusinessException;
import com.temnhaninox.common.exception.ErrorCode;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController {

    private final UserProfileService userProfileService;

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserProfileResponse>> getMyProfile(Authentication authentication) {
        UUID userId = extractUserId(authentication);
        return ResponseEntity.ok(ApiResponse.ok(userProfileService.getMyProfile(userId)));
    }

    @PutMapping("/me")
    public ResponseEntity<ApiResponse<UserProfileResponse>> updateMyProfile(
            Authentication authentication,
            @Valid @RequestBody UpdateProfileRequest request) {
        UUID userId = extractUserId(authentication);
        return ResponseEntity.ok(ApiResponse.ok("Profile updated", userProfileService.updateMyProfile(userId, request)));
    }

    @GetMapping("/me/vat-profiles")
    public ResponseEntity<ApiResponse<List<VatProfileResponse>>> getMyVatProfiles(Authentication authentication) {
        UUID userId = extractUserId(authentication);
        return ResponseEntity.ok(ApiResponse.ok(userProfileService.getMyVatProfiles(userId)));
    }

    @PostMapping("/me/vat-profiles")
    public ResponseEntity<ApiResponse<VatProfileResponse>> createVatProfile(
            Authentication authentication,
            @Valid @RequestBody VatProfileRequest request) {
        UUID userId = extractUserId(authentication);
        VatProfileResponse created = userProfileService.createVatProfile(userId, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("VAT profile created", created));
    }

    @DeleteMapping("/me/vat-profiles/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteVatProfile(
            Authentication authentication,
            @PathVariable UUID id) {
        UUID userId = extractUserId(authentication);
        userProfileService.deleteVatProfile(userId, id);
        return ResponseEntity.ok(ApiResponse.ok("VAT profile deleted", null));
    }

    private UUID extractUserId(Authentication authentication) {
        if (authentication == null || authentication.getPrincipal() == null) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED);
        }
        Object principal = authentication.getPrincipal();
        if (principal instanceof UUID uuid) {
            return uuid;
        }
        return UUID.fromString(principal.toString());
    }
}
