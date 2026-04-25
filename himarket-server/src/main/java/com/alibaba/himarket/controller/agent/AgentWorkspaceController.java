package com.alibaba.himarket.controller.agent;

import com.alibaba.himarket.core.annotation.DeveloperAuth;
import com.alibaba.himarket.core.exception.BusinessException;
import com.alibaba.himarket.core.exception.ErrorCode;
import com.alibaba.himarket.dto.params.agent.CreateWorkspaceParam;
import com.alibaba.himarket.dto.params.agent.UpdateWorkspaceParam;
import com.alibaba.himarket.dto.result.agent.AgentWorkspacePageResult;
import com.alibaba.himarket.dto.result.agent.AgentWorkspaceResult;
import com.alibaba.himarket.service.agent.AgentWorkspaceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
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
@RequestMapping("/api/v1/agent/workspaces")
@Validated
@DeveloperAuth
@RequiredArgsConstructor
public class AgentWorkspaceController {

    private final AgentWorkspaceService workspaceService;

    @GetMapping
    public AgentWorkspacePageResult listWorkspaces(Pageable pageable) {
        return workspaceService.listWorkspaces(currentUserId(), pageable);
    }

    @PostMapping
    public AgentWorkspaceResult createWorkspace(@Valid @RequestBody CreateWorkspaceParam param) {
        return workspaceService.createWorkspace(currentUserId(), param);
    }

    @GetMapping("/{id}")
    public AgentWorkspaceResult getWorkspace(@PathVariable String id) {
        return workspaceService.getWorkspace(currentUserId(), id);
    }

    @PutMapping("/{id}")
    public AgentWorkspaceResult updateWorkspace(
            @PathVariable String id, @Valid @RequestBody UpdateWorkspaceParam param) {
        return workspaceService.updateWorkspace(currentUserId(), id, param);
    }

    @DeleteMapping("/{id}")
    public void deleteWorkspace(@PathVariable String id) {
        workspaceService.deleteWorkspace(currentUserId(), id);
    }

    @PutMapping("/{id}/active")
    public AgentWorkspaceResult activateWorkspace(@PathVariable String id) {
        return workspaceService.activateWorkspace(currentUserId(), id);
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
