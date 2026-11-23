package com.temnhaninox.common.exception;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum ErrorCode {

    VALIDATION_ERROR(400, "VALIDATION_ERROR", "Invalid request parameters"),
    UNAUTHORIZED(401, "UNAUTHORIZED", "Authentication required"),
    FORBIDDEN(403, "FORBIDDEN", "Access denied"),
    RESOURCE_NOT_FOUND(404, "RESOURCE_NOT_FOUND", "Requested resource not found"),
    DUPLICATE_RESOURCE(409, "DUPLICATE_RESOURCE", "Resource already exists"),
    INVALID_STATE_TRANSITION(400, "INVALID_STATE_TRANSITION", "Invalid order state transition"),
    INCOMPATIBLE_MATERIAL_PROCESS(400, "INCOMPATIBLE_MATERIAL_PROCESS", "Selected processing method is not compatible with this material"),
    INVALID_THICKNESS_RANGE(400, "INVALID_THICKNESS_RANGE", "Thickness is outside allowed material range"),
    PROTOTYPE_APPROVAL_REQUIRED(400, "PROTOTYPE_APPROVAL_REQUIRED", "Physical prototype photo must be uploaded and approved first"),
    DEPOSIT_NOT_VERIFIED(400, "DEPOSIT_NOT_VERIFIED", "Required 50% deposit has not been verified"),
    BALANCE_NOT_SETTLED(400, "BALANCE_NOT_SETTLED", "Full order balance must be verified before completion"),
    FILE_UPLOAD_ERROR(400, "FILE_UPLOAD_ERROR", "File upload failed or unsupported file format"),
    INTERNAL_ERROR(500, "INTERNAL_ERROR", "Internal server error");

    private final int httpStatus;
    private final String code;
    private final String defaultMessage;
}
