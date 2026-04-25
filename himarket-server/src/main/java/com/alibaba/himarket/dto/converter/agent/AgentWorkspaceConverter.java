package com.alibaba.himarket.dto.converter.agent;

import com.alibaba.himarket.dto.result.agent.AgentWorkspacePageResult;
import com.alibaba.himarket.dto.result.agent.AgentWorkspaceResult;
import com.alibaba.himarket.entity.agent.AgentWorkspaceEntity;
import java.util.stream.Collectors;
import org.springframework.data.domain.Page;
import org.springframework.stereotype.Component;

@Component
public class AgentWorkspaceConverter {

    public AgentWorkspaceResult toResult(AgentWorkspaceEntity entity) {
        return AgentWorkspaceResult.builder()
                .id(entity.getWorkspaceUid())
                .name(entity.getName())
                .description(entity.getDescription())
                .ownerId(entity.getOwnerId())
                .defaultTeamTemplateId(entity.getDefaultTeamTemplateId())
                .active(entity.getActive())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }

    public AgentWorkspacePageResult toPageResult(Page<AgentWorkspaceEntity> page) {
        return AgentWorkspacePageResult.builder()
                .content(
                        page.getContent().stream().map(this::toResult).collect(Collectors.toList()))
                .totalElements(page.getTotalElements())
                .totalPages(page.getTotalPages())
                .size(page.getSize())
                .number(page.getNumber())
                .first(page.isFirst())
                .last(page.isLast())
                .build();
    }
}
