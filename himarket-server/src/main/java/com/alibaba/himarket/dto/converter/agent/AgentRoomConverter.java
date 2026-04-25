package com.alibaba.himarket.dto.converter.agent;

import com.alibaba.himarket.dto.result.agent.AgentRoomPermissionResult;
import com.alibaba.himarket.dto.result.agent.AgentRoomResult;
import com.alibaba.himarket.entity.agent.AgentRoomEntity;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class AgentRoomConverter {

    private final ObjectMapper objectMapper;

    public AgentRoomResult toResult(AgentRoomEntity entity) {
        return AgentRoomResult.builder()
                .id(entity.getRoomUid())
                .workspaceId(entity.getWorkspaceUid())
                .name(entity.getName())
                .modelId(entity.getModelId())
                .teamTemplateId(entity.getTeamTemplateId())
                .fileRoot(entity.getFileRoot())
                .permission(permission(entity))
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }

    private AgentRoomPermissionResult permission(AgentRoomEntity entity) {
        return AgentJsonConverter.readRequired(
                objectMapper, entity.getPermissionJson(), AgentRoomPermissionResult.class);
    }
}
