package com.alibaba.himarket.service.agent.impl;

import com.alibaba.himarket.dto.params.agent.CreateWorkspaceParam;
import com.alibaba.himarket.dto.params.agent.UpdateWorkspaceParam;
import com.alibaba.himarket.dto.result.agent.AgentWorkspacePageResult;
import com.alibaba.himarket.dto.result.agent.AgentWorkspaceResult;
import com.alibaba.himarket.service.agent.AgentWorkspaceService;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

@Service
public class AgentWorkspaceServiceImpl implements AgentWorkspaceService {

    private static final String NOT_IMPLEMENTED = "not implemented yet — T08";

    @Override
    public AgentWorkspacePageResult listWorkspaces(String userId, Pageable pageable) {
        throw notImplemented();
    }

    @Override
    public AgentWorkspaceResult createWorkspace(String userId, CreateWorkspaceParam param) {
        throw notImplemented();
    }

    @Override
    public AgentWorkspaceResult getWorkspace(String userId, String workspaceId) {
        throw notImplemented();
    }

    @Override
    public AgentWorkspaceResult updateWorkspace(
            String userId, String workspaceId, UpdateWorkspaceParam param) {
        throw notImplemented();
    }

    @Override
    public void deleteWorkspace(String userId, String workspaceId) {
        throw notImplemented();
    }

    @Override
    public AgentWorkspaceResult activateWorkspace(String userId, String workspaceId) {
        throw notImplemented();
    }

    private UnsupportedOperationException notImplemented() {
        return new UnsupportedOperationException(NOT_IMPLEMENTED);
    }
}
