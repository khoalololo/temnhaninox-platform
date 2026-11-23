package com.temnhaninox.auth.dto;

import com.temnhaninox.common.enums.UserRole;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserProfileResponse {

    private UUID id;
    private String email;
    private String fullName;
    private String phone;
    private String defaultAddress;
    private UserRole role;
    private Boolean isActive;
    private Instant createdAt;
}
