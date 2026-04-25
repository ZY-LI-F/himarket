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
public class AgentRoomConfigResult {

    private String roomId;

    private String modelId;

    private String teamTemplateId;

    private List<AgentBindingRefResult> skillBindings;

    private List<AgentBindingRefResult> mcpBindings;

    private AgentRoomPermissionResult permission;
}
