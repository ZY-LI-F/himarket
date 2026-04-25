package com.alibaba.himarket.dto.result.agent;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AgentRoomPermissionResult {

    private Boolean readonly;

    private List<String> allowedUserIds;
}
