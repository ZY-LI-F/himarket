package com.alibaba.himarket.dto.params.agent;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class BindingRefParam {

    @NotBlank(message = "productId cannot be empty")
    private String productId;

    @NotBlank(message = "version cannot be empty")
    private String version;

    @NotBlank(message = "status cannot be empty")
    private String status;
}
