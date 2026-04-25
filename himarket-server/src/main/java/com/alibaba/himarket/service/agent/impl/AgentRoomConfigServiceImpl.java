package com.alibaba.himarket.service.agent.impl;

import com.alibaba.himarket.dto.params.agent.UpdateRoomConfigParam;
import com.alibaba.himarket.dto.result.agent.AgentRoomConfigResult;
import com.alibaba.himarket.service.agent.AgentRoomConfigService;
import org.springframework.stereotype.Service;

@Service
public class AgentRoomConfigServiceImpl implements AgentRoomConfigService {

    private static final String NOT_IMPLEMENTED = "not implemented yet — T08";

    @Override
    public AgentRoomConfigResult getRoomConfig(String userId, String roomId) {
        throw notImplemented();
    }

    @Override
    public AgentRoomConfigResult updateRoomConfig(
            String userId, String roomId, UpdateRoomConfigParam param) {
        throw notImplemented();
    }

    private UnsupportedOperationException notImplemented() {
        return new UnsupportedOperationException(NOT_IMPLEMENTED);
    }
}
