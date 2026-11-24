package com.temnhaninox.catalog.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CategoryRequest {

    private UUID parentId;

    @NotBlank(message = "Category name is required")
    @Size(max = 150)
    private String name;

    @NotBlank(message = "Category slug is required")
    @Size(max = 160)
    private String slug;

    private Integer displayOrder;
    private Boolean isActive;
}
