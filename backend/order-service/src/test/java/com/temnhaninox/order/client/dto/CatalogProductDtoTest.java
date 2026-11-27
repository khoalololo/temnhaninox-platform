package com.temnhaninox.order.client.dto;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class CatalogProductDtoTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void deserializesCatalogIsActiveProperty() throws Exception {
        CatalogProductDto product = objectMapper.readValue(
                """
                {"id":"cfe4a317-1952-4c7f-979a-11fc7342d847","isActive":true}
                """,
                CatalogProductDto.class);

        assertThat(product.isActive()).isTrue();
    }
}
