package com.temnhaninox.catalog.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CategoryResponse {

    private UUID id;
    private UUID parentId;
    private String name;
    private String slug;
    private Integer displayOrder;
    private Boolean isActive;

    @Builder.Default
    private List<CategoryResponse> children = new ArrayList<>();
}
