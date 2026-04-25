package com.alibaba.himarket.dto.result.agent;

import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AgentRoomResult {

    private String id;

    private String workspaceId;

    private String name;

    private String modelId;

    private String teamTemplateId;

    private String fileRoot;

    private AgentRoomPermissionResult permission;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}
