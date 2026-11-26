package com.temnhaninox.auth.service;

import com.temnhaninox.auth.dto.UpdateProfileRequest;
import com.temnhaninox.auth.dto.UserProfileResponse;
import com.temnhaninox.auth.dto.VatProfileRequest;
import com.temnhaninox.auth.dto.VatProfileResponse;
import com.temnhaninox.auth.entity.CustomerVatProfile;
import com.temnhaninox.auth.entity.User;
import com.temnhaninox.auth.repository.CustomerVatProfileRepository;
import com.temnhaninox.auth.repository.UserRepository;
import com.temnhaninox.common.exception.BusinessException;
import com.temnhaninox.common.exception.ErrorCode;
import com.temnhaninox.common.dto.PageResponse;
import com.temnhaninox.common.enums.UserRole;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.ArrayList;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserProfileService {

    private final UserRepository userRepository;
    private final CustomerVatProfileRepository vatProfileRepository;

    @Transactional(readOnly = true)
    public PageResponse<UserProfileResponse> getCustomers(String search, int page, int size) {
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), 100);
        Specification<User> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("role"), UserRole.CUSTOMER));
            if (search != null && !search.isBlank()) {
                String pattern = "%" + search.trim().toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("fullName")), pattern),
                        cb.like(cb.lower(root.get("email")), pattern),
                        cb.like(cb.lower(root.get("phone")), pattern)
                ));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
        Page<User> result = userRepository.findAll(
                spec,
                PageRequest.of(safePage, safeSize, Sort.by(Sort.Direction.DESC, "createdAt"))
        );
        return PageResponse.<UserProfileResponse>builder()
                .content(result.getContent().stream().map(AuthService::toUserProfileResponse).toList())
                .page(result.getNumber())
                .size(result.getSize())
                .totalElements(result.getTotalElements())
                .totalPages(result.getTotalPages())
                .last(result.isLast())
                .build();
    }

    @Transactional(readOnly = true)
    public UserProfileResponse getMyProfile(UUID userId) {
        User user = findUserOrThrow(userId);
        return AuthService.toUserProfileResponse(user);
    }

    @Transactional
    public UserProfileResponse updateMyProfile(UUID userId, UpdateProfileRequest request) {
        User user = findUserOrThrow(userId);
        user.setFullName(request.getFullName().trim());
        user.setPhone(request.getPhone().trim());
        user.setDefaultAddress(request.getDefaultAddress());
        User saved = userRepository.save(user);
        return AuthService.toUserProfileResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<VatProfileResponse> getMyVatProfiles(UUID userId) {
        return vatProfileRepository.findAllByUserIdOrderByIsDefaultDescCreatedAtDesc(userId)
                .stream()
                .map(this::toVatProfileResponse)
                .toList();
    }

    @Transactional
    public VatProfileResponse createVatProfile(UUID userId, VatProfileRequest request) {
        User user = findUserOrThrow(userId);
        boolean isDefault = Boolean.TRUE.equals(request.getIsDefault());

        if (isDefault) {
            vatProfileRepository.clearDefaultForUser(userId);
        }

        CustomerVatProfile profile = CustomerVatProfile.builder()
                .user(user)
                .companyName(request.getCompanyName().trim())
                .taxCode(request.getTaxCode().trim())
                .companyAddress(request.getCompanyAddress().trim())
                .isDefault(isDefault)
                .build();

        CustomerVatProfile saved = vatProfileRepository.save(profile);
        return toVatProfileResponse(saved);
    }

    @Transactional
    public void deleteVatProfile(UUID userId, UUID profileId) {
        CustomerVatProfile profile = vatProfileRepository.findByIdAndUserId(profileId, userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "VAT profile not found"));
        vatProfileRepository.delete(profile);
    }

    private User findUserOrThrow(UUID userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "User not found"));
    }

    private VatProfileResponse toVatProfileResponse(CustomerVatProfile profile) {
        return VatProfileResponse.builder()
                .id(profile.getId())
                .companyName(profile.getCompanyName())
                .taxCode(profile.getTaxCode())
                .companyAddress(profile.getCompanyAddress())
                .isDefault(profile.getIsDefault())
                .createdAt(profile.getCreatedAt())
                .build();
    }
}
