package com.alibaba.himarket.service.agent.impl;

import com.alibaba.himarket.core.exception.BusinessException;
import com.alibaba.himarket.core.exception.ErrorCode;
import com.alibaba.himarket.core.utils.IdGenerator;
import com.alibaba.himarket.dto.converter.agent.AgentWorkspaceConverter;
import com.alibaba.himarket.dto.params.agent.CreateWorkspaceParam;
import com.alibaba.himarket.dto.params.agent.UpdateWorkspaceParam;
import com.alibaba.himarket.dto.result.agent.AgentWorkspacePageResult;
import com.alibaba.himarket.dto.result.agent.AgentWorkspaceResult;
import com.alibaba.himarket.entity.agent.AgentWorkspaceEntity;
import com.alibaba.himarket.repository.agent.AgentWorkspaceRepository;
import com.alibaba.himarket.service.agent.AgentNacosSyncService;
import com.alibaba.himarket.service.agent.AgentWorkspaceService;
import java.time.LocalDateTime;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class AgentWorkspaceServiceImpl implements AgentWorkspaceService {

    private static final String WORKSPACE_PREFIX = "ws-";
    private static final String WORKSPACE_RESOURCE = "AgentWorkspace";
    private static final String AUTH_MISMATCH_MESSAGE =
            "userId conflicts with authenticated principal";

    private final AgentWorkspaceRepository workspaceRepository;
    private final AgentWorkspaceConverter workspaceConverter;
    private final AgentNacosSyncService nacosSyncService;

    @Override
    @Transactional(readOnly = true)
    public AgentWorkspacePageResult listWorkspaces(String userId, Pageable pageable) {
        return workspaceConverter.toPageResult(
                workspaceRepository.findByTenantIdAndDeletedAtIsNull(
                        resolveTenantId(userId), pageable));
    }

    @Override
    public AgentWorkspaceResult createWorkspace(String userId, CreateWorkspaceParam param) {
        LocalDateTime now = LocalDateTime.now();
        AgentWorkspaceEntity workspace =
                AgentWorkspaceEntity.builder()
                        .workspaceUid(IdGenerator.genIdWithPrefix(WORKSPACE_PREFIX))
                        .tenantId(resolveTenantId(userId))
                        .ownerId(userId)
                        .name(param.getName())
                        .description(param.getDescription())
                        .defaultTeamTemplateId(param.getDefaultTeamTemplateId())
                        .active(Boolean.FALSE)
                        .createdAt(now)
                        .updatedAt(now)
                        .build();
        AgentWorkspaceEntity saved = workspaceRepository.save(workspace);
        publishWorkspaceSnapshot();
        return workspaceConverter.toResult(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public AgentWorkspaceResult getWorkspace(String userId, String workspaceId) {
        return workspaceConverter.toResult(findWorkspace(userId, workspaceId));
    }

    @Override
    public AgentWorkspaceResult updateWorkspace(
            String userId, String workspaceId, UpdateWorkspaceParam param) {
        AgentWorkspaceEntity workspace = findWorkspace(userId, workspaceId);
        workspace.setName(param.getName());
        workspace.setDescription(param.getDescription());
        workspace.setDefaultTeamTemplateId(param.getDefaultTeamTemplateId());
        workspace.setUpdatedAt(LocalDateTime.now());
        AgentWorkspaceEntity saved = workspaceRepository.saveAndFlush(workspace);
        publishWorkspaceSnapshot();
        return workspaceConverter.toResult(saved);
    }

    @Override
    public void deleteWorkspace(String userId, String workspaceId) {
        AgentWorkspaceEntity workspace = findWorkspace(userId, workspaceId);
        workspace.setActive(Boolean.FALSE);
        workspace.setDeletedAt(LocalDateTime.now());
        workspace.setUpdatedAt(workspace.getDeletedAt());
        workspaceRepository.saveAndFlush(workspace);
        publishWorkspaceSnapshot();
    }

    @Override
    public AgentWorkspaceResult activateWorkspace(String userId, String workspaceId) {
        String tenantId = resolveTenantId(userId);
        AgentWorkspaceEntity workspace = findWorkspaceByTenant(workspaceId, tenantId);
        workspaceRepository.deactivateTenantWorkspaces(tenantId);
        workspace.setActive(Boolean.TRUE);
        workspace.setUpdatedAt(LocalDateTime.now());
        AgentWorkspaceEntity saved = workspaceRepository.saveAndFlush(workspace);
        publishWorkspaceSnapshot();
        return workspaceConverter.toResult(saved);
    }

    private void publishWorkspaceSnapshot() {
        nacosSyncService.publishWorkspaceList();
        nacosSyncService.publishTeamTemplateList();
    }

    private AgentWorkspaceEntity findWorkspace(String userId, String workspaceId) {
        return findWorkspaceByTenant(workspaceId, resolveTenantId(userId));
    }

    private AgentWorkspaceEntity findWorkspaceByTenant(String workspaceId, String tenantId) {
        return workspaceRepository
                .findByWorkspaceUidAndTenantIdAndDeletedAtIsNull(workspaceId, tenantId)
                .orElseThrow(
                        () ->
                                new BusinessException(
                                        ErrorCode.NOT_FOUND, WORKSPACE_RESOURCE, workspaceId));
    }

    private String resolveTenantId(String userId) {
        String currentUserId = currentUserId();
        if (!currentUserId.equals(userId)) {
            throw new BusinessException(ErrorCode.CONFLICT, AUTH_MISMATCH_MESSAGE);
        }
        return currentUserId;
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
