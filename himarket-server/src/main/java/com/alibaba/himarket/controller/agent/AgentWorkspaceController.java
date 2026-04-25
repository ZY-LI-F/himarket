package com.alibaba.himarket.controller.agent;

import com.alibaba.himarket.core.annotation.DeveloperAuth;
import com.alibaba.himarket.dto.params.agent.CreateWorkspaceParam;
import com.alibaba.himarket.dto.params.agent.UpdateWorkspaceParam;
import com.alibaba.himarket.dto.result.agent.AgentWorkspacePageResult;
import com.alibaba.himarket.dto.result.agent.AgentWorkspaceResult;
import jakarta.validation.Valid;
import org.springframework.data.domain.Pageable;
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
public class AgentWorkspaceController {

    @GetMapping
    public AgentWorkspacePageResult listWorkspaces(Pageable pageable) {
        return AgentStubResponses.stubResponse(AgentStubResponses::workspacePage);
    }

    @PostMapping
    public AgentWorkspaceResult createWorkspace(@Valid @RequestBody CreateWorkspaceParam param) {
        return AgentStubResponses.stubResponse(
                userId -> AgentStubResponses.workspace("ws-created", userId));
    }

    @GetMapping("/{id}")
    public AgentWorkspaceResult getWorkspace(@PathVariable String id) {
        return AgentStubResponses.stubResponse(userId -> AgentStubResponses.workspace(id, userId));
    }

    @PutMapping("/{id}")
    public AgentWorkspaceResult updateWorkspace(
            @PathVariable String id, @Valid @RequestBody UpdateWorkspaceParam param) {
        return AgentStubResponses.stubResponse(userId -> AgentStubResponses.workspace(id, userId));
    }

    @DeleteMapping("/{id}")
    public void deleteWorkspace(@PathVariable String id) {
        AgentStubResponses.stubResponse(AgentStubResponses::noContent);
    }

    @PutMapping("/{id}/active")
    public AgentWorkspaceResult activateWorkspace(@PathVariable String id) {
        return AgentStubResponses.stubResponse(userId -> AgentStubResponses.workspace(id, userId));
    }
}
