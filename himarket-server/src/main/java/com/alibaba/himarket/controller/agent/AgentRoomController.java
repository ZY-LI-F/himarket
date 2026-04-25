package com.alibaba.himarket.controller.agent;

import com.alibaba.himarket.core.annotation.DeveloperAuth;
import com.alibaba.himarket.dto.params.agent.CreateRoomParam;
import com.alibaba.himarket.dto.params.agent.UpdateRoomParam;
import com.alibaba.himarket.dto.result.agent.AgentRoomResult;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/agent")
@Validated
@DeveloperAuth
public class AgentRoomController {

    @GetMapping("/workspaces/{wsId}/rooms")
    public List<AgentRoomResult> listRooms(@PathVariable String wsId) {
        return AgentStubResponses.stubResponse(
                userId -> List.of(AgentStubResponses.room(wsId, "room-stub", userId)));
    }

    @PostMapping("/workspaces/{wsId}/rooms")
    public AgentRoomResult createRoom(
            @PathVariable String wsId, @Valid @RequestBody CreateRoomParam param) {
        return AgentStubResponses.stubResponse(
                userId -> AgentStubResponses.room(wsId, "room-created", userId));
    }

    @GetMapping("/rooms/{id}")
    public AgentRoomResult getRoom(@PathVariable String id) {
        return AgentStubResponses.stubResponse(
                userId -> AgentStubResponses.room("ws-stub", id, userId));
    }

    @PutMapping("/rooms/{id}")
    public AgentRoomResult updateRoom(
            @PathVariable String id, @Valid @RequestBody UpdateRoomParam param) {
        return AgentStubResponses.stubResponse(
                userId -> AgentStubResponses.room("ws-stub", id, userId));
    }

    @DeleteMapping("/rooms/{id}")
    public void deleteRoom(@PathVariable String id) {
        AgentStubResponses.stubResponse(AgentStubResponses::noContent);
    }
}
