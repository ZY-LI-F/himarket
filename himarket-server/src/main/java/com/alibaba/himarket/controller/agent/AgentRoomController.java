package com.alibaba.himarket.controller.agent;

import com.alibaba.himarket.core.annotation.DeveloperAuth;
import com.alibaba.himarket.core.exception.BusinessException;
import com.alibaba.himarket.core.exception.ErrorCode;
import com.alibaba.himarket.dto.params.agent.CreateRoomParam;
import com.alibaba.himarket.dto.params.agent.UpdateRoomParam;
import com.alibaba.himarket.dto.result.agent.AgentRoomResult;
import com.alibaba.himarket.service.agent.AgentRoomService;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
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
@RequiredArgsConstructor
public class AgentRoomController {

    private final AgentRoomService roomService;

    @GetMapping("/workspaces/{wsId}/rooms")
    public List<AgentRoomResult> listRooms(@PathVariable String wsId) {
        return roomService.listRooms(currentUserId(), wsId);
    }

    @PostMapping("/workspaces/{wsId}/rooms")
    public AgentRoomResult createRoom(
            @PathVariable String wsId, @Valid @RequestBody CreateRoomParam param) {
        return roomService.createRoom(currentUserId(), wsId, param);
    }

    @GetMapping("/rooms/{id}")
    public AgentRoomResult getRoom(@PathVariable String id) {
        return roomService.getRoom(currentUserId(), id);
    }

    @PutMapping("/rooms/{id}")
    public AgentRoomResult updateRoom(
            @PathVariable String id, @Valid @RequestBody UpdateRoomParam param) {
        return roomService.updateRoom(currentUserId(), id, param);
    }

    @DeleteMapping("/rooms/{id}")
    public void deleteRoom(@PathVariable String id) {
        roomService.deleteRoom(currentUserId(), id);
    }

    private String currentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null
                || !authentication.isAuthenticated()
                || "anonymousUser".equals(authentication.getName())) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED, "用户未认证");
        }
        return authentication.getName();
    }
}
