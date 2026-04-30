package com.alibaba.himarket.dto.params.worker;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class WorkerTeamProductMemberParam {

    @NotBlank(message = "Worker team product member role cannot be blank")
    @Pattern(
            regexp = "leader|member|skill",
            message = "Worker team product member role must be leader, member, or skill")
    private String role;

    @NotBlank(message = "Worker team product member ref name cannot be blank")
    @Size(max = 128, message = "Worker team product member ref name cannot exceed 128 characters")
    private String refName;

    @NotBlank(message = "Worker team product member ref version cannot be blank")
    @Size(max = 64, message = "Worker team product member ref version cannot exceed 64 characters")
    private String refVersion;

    @NotNull(message = "Worker team product member ordinal cannot be null")
    private Integer ordinal;
}
