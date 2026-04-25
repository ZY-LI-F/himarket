package com.alibaba.himarket.dto.converter.agent;

import com.alibaba.himarket.dto.result.agent.AgentRoomConfigResult;
import com.alibaba.himarket.entity.agent.AgentRoomConfigEntity;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class AgentRoomConfigConverter {

    private final ObjectMapper objectMapper;

    public AgentRoomConfigResult toResult(AgentRoomConfigEntity entity) {
        return AgentJsonConverter.readRequired(
                objectMapper, entity.getConfigJson(), AgentRoomConfigResult.class);
    }
}
