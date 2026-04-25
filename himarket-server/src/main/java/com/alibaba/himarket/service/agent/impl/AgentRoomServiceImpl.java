package com.alibaba.himarket.service.agent.impl;

import com.alibaba.himarket.dto.params.agent.CreateRoomParam;
import com.alibaba.himarket.dto.params.agent.UpdateRoomParam;
import com.alibaba.himarket.dto.result.agent.AgentRoomResult;
import com.alibaba.himarket.service.agent.AgentRoomService;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class AgentRoomServiceImpl implements AgentRoomService {

    private static final String NOT_IMPLEMENTED = "not implemented yet — T08";

    @Override
    public List<AgentRoomResult> listRooms(String userId, String workspaceId) {
        throw notImplemented();
    }

    @Override
    public AgentRoomResult createRoom(String userId, String workspaceId, CreateRoomParam param) {
        throw notImplemented();
    }

    @Override
    public AgentRoomResult getRoom(String userId, String roomId) {
        throw notImplemented();
    }

    @Override
    public AgentRoomResult updateRoom(String userId, String roomId, UpdateRoomParam param) {
        throw notImplemented();
    }

    @Override
    public void deleteRoom(String userId, String roomId) {
        throw notImplemented();
    }

    private UnsupportedOperationException notImplemented() {
        return new UnsupportedOperationException(NOT_IMPLEMENTED);
    }
}
