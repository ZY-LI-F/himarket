package com.alibaba.himarket.dto.result.agent;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AgentTaskRunResult {

    private String id;

    private String roomId;

    private String status;

    private String prompt;

    private Map<String, Object> plan;

    private List<AgentTaskEventResult> events;

    private List<AgentArtifactResult> artifacts;

    private String failureExcerpt;

    private LocalDateTime createdAt;

    private LocalDateTime completedAt;
}
