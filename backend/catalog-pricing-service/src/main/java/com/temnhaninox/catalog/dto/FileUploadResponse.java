package com.temnhaninox.catalog.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FileUploadResponse {

    private String bucket;
    private String key;
    private String fileName;
    private String contentType;
    private long size;
    private String url;
}
