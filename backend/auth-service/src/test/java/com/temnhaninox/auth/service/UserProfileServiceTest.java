package com.temnhaninox.auth.service;

import com.temnhaninox.auth.dto.VatProfileRequest;
import com.temnhaninox.auth.dto.VatProfileResponse;
import com.temnhaninox.auth.entity.CustomerVatProfile;
import com.temnhaninox.auth.entity.User;
import com.temnhaninox.auth.repository.CustomerVatProfileRepository;
import com.temnhaninox.auth.repository.UserRepository;
import com.temnhaninox.common.enums.UserRole;
import com.temnhaninox.common.exception.BusinessException;
import com.temnhaninox.common.exception.ErrorCode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserProfileServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private CustomerVatProfileRepository vatProfileRepository;

    private UserProfileService userProfileService;

    @BeforeEach
    void setUp() {
        userProfileService = new UserProfileService(userRepository, vatProfileRepository);
    }

    @Test
    void createVatProfile_shouldClearPreviousDefaultWhenIsDefaultTrue() {
        UUID userId = UUID.randomUUID();
        User user = User.builder().id(userId).email("a@b.com").role(UserRole.CUSTOMER).build();

        VatProfileRequest request = VatProfileRequest.builder()
                .companyName("Cong ty TNHH Inox ABC")
                .taxCode("0312345678")
                .companyAddress("456 Nguyen Trai, HCM")
                .isDefault(true)
                .build();

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(vatProfileRepository.save(any(CustomerVatProfile.class))).thenAnswer(inv -> {
            CustomerVatProfile p = inv.getArgument(0);
            p.setId(UUID.randomUUID());
            p.setCreatedAt(Instant.now());
            return p;
        });

        VatProfileResponse response = userProfileService.createVatProfile(userId, request);

        verify(vatProfileRepository).clearDefaultForUser(userId);
        assertThat(response.getCompanyName()).isEqualTo("Cong ty TNHH Inox ABC");
        assertThat(response.getIsDefault()).isTrue();
    }

    @Test
    void deleteVatProfile_shouldThrowNotFoundWhenNotOwnedByUser() {
        UUID userId = UUID.randomUUID();
        UUID profileId = UUID.randomUUID();

        when(vatProfileRepository.findByIdAndUserId(profileId, userId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> userProfileService.deleteVatProfile(userId, profileId))
                .isInstanceOf(BusinessException.class)
                .satisfies(ex -> assertThat(((BusinessException) ex).getErrorCode()).isEqualTo(ErrorCode.RESOURCE_NOT_FOUND));
    }
}
