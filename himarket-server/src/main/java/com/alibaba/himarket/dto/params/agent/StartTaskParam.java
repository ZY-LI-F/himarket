package com.alibaba.himarket.dto.params.agent;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import java.util.List;
import lombok.Data;

@Data
public class StartTaskParam {

    @NotBlank(message = "prompt cannot be empty")
    private String prompt;

    private List<String> files;

    @NotBlank(message = "mode cannot be empty")
    @Pattern(regexp = "chat|task", message = "mode must be chat or task")
    private String mode;
}
