package com.alibaba.himarket.dto.result.agent;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AgentWorkspaceResult {

    private String id;

    private String name;

    private String description;

    private String ownerId;

    private String defaultTeamTemplateId;

    @JsonProperty("isActive")
    private Boolean active;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}
