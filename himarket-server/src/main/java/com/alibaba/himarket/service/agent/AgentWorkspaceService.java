package com.alibaba.himarket.service.agent;

import com.alibaba.himarket.dto.params.agent.CreateWorkspaceParam;
import com.alibaba.himarket.dto.params.agent.UpdateWorkspaceParam;
import com.alibaba.himarket.dto.result.agent.AgentWorkspacePageResult;
import com.alibaba.himarket.dto.result.agent.AgentWorkspaceResult;
import org.springframework.data.domain.Pageable;

public interface AgentWorkspaceService {

    AgentWorkspacePageResult listWorkspaces(String userId, Pageable pageable);

    AgentWorkspaceResult createWorkspace(String userId, CreateWorkspaceParam param);

    AgentWorkspaceResult getWorkspace(String userId, String workspaceId);

    AgentWorkspaceResult updateWorkspace(
            String userId, String workspaceId, UpdateWorkspaceParam param);

    void deleteWorkspace(String userId, String workspaceId);

    AgentWorkspaceResult activateWorkspace(String userId, String workspaceId);
}
