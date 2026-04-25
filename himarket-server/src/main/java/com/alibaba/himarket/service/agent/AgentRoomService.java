package com.alibaba.himarket.service.agent;

import com.alibaba.himarket.dto.params.agent.CreateRoomParam;
import com.alibaba.himarket.dto.params.agent.UpdateRoomParam;
import com.alibaba.himarket.dto.result.agent.AgentRoomResult;
import java.util.List;

public interface AgentRoomService {

    List<AgentRoomResult> listRooms(String userId, String workspaceId);

    AgentRoomResult createRoom(String userId, String workspaceId, CreateRoomParam param);

    AgentRoomResult getRoom(String userId, String roomId);

    AgentRoomResult updateRoom(String userId, String roomId, UpdateRoomParam param);

    void deleteRoom(String userId, String roomId);
}
