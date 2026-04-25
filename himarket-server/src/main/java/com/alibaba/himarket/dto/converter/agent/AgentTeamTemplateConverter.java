package com.alibaba.himarket.dto.converter.agent;

import com.alibaba.himarket.dto.result.agent.AgentProfileRefResult;
import com.alibaba.himarket.dto.result.agent.AgentTeamTemplateResult;
import com.alibaba.himarket.entity.agent.AgentTeamTemplateEntity;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class AgentTeamTemplateConverter {

    private final ObjectMapper objectMapper;

    public AgentTeamTemplateResult toResult(AgentTeamTemplateEntity entity) {
        return AgentTeamTemplateResult.builder()
                .id(entity.getTemplateId())
                .name(entity.getName())
                .version(entity.getVersion())
                .manager(manager(entity))
                .workers(workers(entity))
                .defaultSkills(strings(entity.getDefaultSkills(), "TeamTemplate.defaultSkills"))
                .defaultMcps(strings(entity.getDefaultMcps(), "TeamTemplate.defaultMcps"))
                .build();
    }

    private AgentProfileRefResult manager(AgentTeamTemplateEntity entity) {
        return AgentJsonConverter.readRequired(
                objectMapper, entity.getManagerProfileJson(), AgentProfileRefResult.class);
    }

    private List<AgentProfileRefResult> workers(AgentTeamTemplateEntity entity) {
        return AgentJsonConverter.readRequired(
                objectMapper,
                entity.getWorkersProfileJson(),
                new TypeReference<List<AgentProfileRefResult>>() {},
                "TeamTemplate.workers");
    }

    private List<String> strings(String json, String targetName) {
        return AgentJsonConverter.readRequired(
                objectMapper, json, new TypeReference<List<String>>() {}, targetName);
    }
}
