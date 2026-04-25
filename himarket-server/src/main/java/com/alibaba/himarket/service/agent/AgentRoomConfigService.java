package com.alibaba.himarket.service.agent;

import com.alibaba.himarket.dto.params.agent.UpdateRoomConfigParam;
import com.alibaba.himarket.dto.result.agent.AgentRoomConfigResult;

public interface AgentRoomConfigService {

    AgentRoomConfigResult getRoomConfig(String userId, String roomId);

    AgentRoomConfigResult updateRoomConfig(
            String userId, String roomId, UpdateRoomConfigParam param);
}
