package com.alibaba.himarket.controller.agent;

import com.alibaba.himarket.core.annotation.DeveloperAuth;
import com.alibaba.himarket.core.exception.BusinessException;
import com.alibaba.himarket.core.exception.ErrorCode;
import com.alibaba.himarket.dto.params.agent.UpdateRoomConfigParam;
import com.alibaba.himarket.dto.result.agent.AgentRoomConfigResult;
import com.alibaba.himarket.service.agent.AgentRoomConfigService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/agent/rooms/{id}/config")
@Validated
@DeveloperAuth
@RequiredArgsConstructor
public class AgentRoomConfigController {

    private final AgentRoomConfigService roomConfigService;

    @GetMapping
    public AgentRoomConfigResult getRoomConfig(@PathVariable String id) {
        return roomConfigService.getRoomConfig(currentUserId(), id);
    }

    @PutMapping
    public AgentRoomConfigResult updateRoomConfig(
            @PathVariable String id, @Valid @RequestBody UpdateRoomConfigParam param) {
        return roomConfigService.updateRoomConfig(currentUserId(), id, param);
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
