package com.alibaba.himarket.dto.converter.agent;

import com.alibaba.himarket.dto.result.agent.AgentArtifactResult;
import com.alibaba.himarket.dto.result.agent.AgentTaskEventResult;
import com.alibaba.himarket.dto.result.agent.AgentTaskRunResult;
import com.alibaba.himarket.dto.result.agent.AgentTaskRunSummaryResult;
import com.alibaba.himarket.entity.agent.AgentTaskRunEntity;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class AgentTaskRunConverter {

    private final ObjectMapper objectMapper;

    public AgentTaskRunSummaryResult toSummary(AgentTaskRunEntity entity) {
        return AgentTaskRunSummaryResult.builder()
                .id(entity.getTaskUid())
                .roomId(entity.getRoomUid())
                .status(entity.getStatus())
                .prompt(entity.getPrompt())
                .failureExcerpt(entity.getFailureExcerpt())
                .createdAt(entity.getCreatedAt())
                .completedAt(entity.getCompletedAt())
                .build();
    }

    public AgentTaskRunResult toResult(AgentTaskRunEntity entity) {
        return AgentTaskRunResult.builder()
                .id(entity.getTaskUid())
                .roomId(entity.getRoomUid())
                .status(entity.getStatus())
                .prompt(entity.getPrompt())
                .plan(AgentJsonConverter.readOptionalMap(objectMapper, entity.getPlanJson()))
                .events(events(entity))
                .artifacts(artifacts(entity))
                .failureExcerpt(entity.getFailureExcerpt())
                .createdAt(entity.getCreatedAt())
                .completedAt(entity.getCompletedAt())
                .build();
    }

    private List<AgentTaskEventResult> events(AgentTaskRunEntity entity) {
        return AgentJsonConverter.readRequired(
                objectMapper,
                entity.getEventsJson(),
                new TypeReference<List<AgentTaskEventResult>>() {},
                "TaskRun.events");
    }

    private List<AgentArtifactResult> artifacts(AgentTaskRunEntity entity) {
        return AgentJsonConverter.readRequired(
                objectMapper,
                entity.getArtifactsJson(),
                new TypeReference<List<AgentArtifactResult>>() {},
                "TaskRun.artifacts");
    }
}
