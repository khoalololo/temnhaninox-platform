package com.temnhaninox.auth.controller;

import com.temnhaninox.auth.dto.UserProfileResponse;
import com.temnhaninox.auth.service.UserProfileService;
import com.temnhaninox.common.dto.ApiResponse;
import com.temnhaninox.common.dto.PageResponse;
import com.temnhaninox.common.enums.UserRole;
import com.temnhaninox.common.exception.BusinessException;
import com.temnhaninox.common.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/users/admin")
@RequiredArgsConstructor
public class AdminUserController {

    private final UserProfileService userProfileService;

    @GetMapping("/customers")
    public ApiResponse<PageResponse<UserProfileResponse>> getCustomers(
            @RequestHeader(value = "X-User-Role", required = false) String role,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        if (!UserRole.ADMIN.name().equalsIgnoreCase(role)) {
            throw new BusinessException(ErrorCode.FORBIDDEN, "Admin role required");
        }
        return ApiResponse.ok(userProfileService.getCustomers(search, page, size));
    }
}
