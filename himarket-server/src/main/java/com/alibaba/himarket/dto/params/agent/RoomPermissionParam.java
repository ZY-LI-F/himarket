package com.alibaba.himarket.dto.params.agent;

import jakarta.validation.constraints.NotNull;
import java.util.List;
import lombok.Data;

@Data
public class RoomPermissionParam {

    @NotNull(message = "readonly cannot be null")
    private Boolean readonly;

    @NotNull(message = "allowedUserIds cannot be null")
    private List<String> allowedUserIds;
}
