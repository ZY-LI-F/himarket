package com.alibaba.himarket.dto.params.agent;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class CreateBindingParam {

    @NotBlank(message = "kind cannot be empty")
    @Pattern(regexp = "SKILL|MCP|MODEL", message = "kind must be SKILL, MCP, or MODEL")
    private String kind;

    @NotBlank(message = "productId cannot be empty")
    private String productId;

    @NotBlank(message = "version cannot be empty")
    private String version;
}
