package com.alibaba.himarket.dto.params.agent;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UpdateWorkspaceParam {

    @NotBlank(message = "name cannot be empty")
    @Size(max = 128, message = "name cannot exceed 128 characters")
    private String name;

    @Size(max = 1024, message = "description cannot exceed 1024 characters")
    private String description;

    private String defaultTeamTemplateId;
}
