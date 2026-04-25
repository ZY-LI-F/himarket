package com.alibaba.himarket.dto.params.agent;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import lombok.Data;

@Data
public class UpdateRoomConfigParam {

    @NotBlank(message = "roomId cannot be empty")
    private String roomId;

    @NotBlank(message = "modelId cannot be empty")
    private String modelId;

    @NotBlank(message = "teamTemplateId cannot be empty")
    private String teamTemplateId;

    @Valid
    @NotNull(message = "skillBindings cannot be null")
    private List<BindingRefParam> skillBindings;

    @Valid
    @NotNull(message = "mcpBindings cannot be null")
    private List<BindingRefParam> mcpBindings;

    @Valid
    @NotNull(message = "permission cannot be null")
    private RoomPermissionParam permission;
}
