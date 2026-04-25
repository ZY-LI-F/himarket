package com.alibaba.himarket.dto.converter.agent;

import com.alibaba.himarket.dto.result.agent.AgentBindingResult;
import com.alibaba.himarket.entity.agent.AgentBindingEntity;
import org.springframework.stereotype.Component;

@Component
public class AgentBindingConverter {

    public AgentBindingResult toResult(AgentBindingEntity entity) {
        return AgentBindingResult.builder()
                .id(entity.getBindingUid())
                .roomId(entity.getRoomUid())
                .kind(entity.getKind())
                .productId(entity.getProductId())
                .version(entity.getVersion())
                .status(entity.getStatus())
                .createdAt(entity.getCreatedAt())
                .build();
    }
}
