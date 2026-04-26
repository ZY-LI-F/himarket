package com.alibaba.himarket.service.agent.impl;

import com.alibaba.himarket.core.exception.BusinessException;
import com.alibaba.himarket.core.exception.ErrorCode;
import com.alibaba.himarket.core.utils.IdGenerator;
import com.alibaba.himarket.dto.converter.agent.AgentRoomConverter;
import com.alibaba.himarket.dto.params.agent.CreateRoomParam;
import com.alibaba.himarket.dto.params.agent.UpdateRoomParam;
import com.alibaba.himarket.dto.result.agent.AgentRoomConfigResult;
import com.alibaba.himarket.dto.result.agent.AgentRoomPermissionResult;
import com.alibaba.himarket.dto.result.agent.AgentRoomResult;
import com.alibaba.himarket.entity.agent.AgentRoomConfigEntity;
import com.alibaba.himarket.entity.agent.AgentRoomEntity;
import com.alibaba.himarket.entity.agent.AgentWorkspaceEntity;
import com.alibaba.himarket.repository.agent.AgentRoomConfigRepository;
import com.alibaba.himarket.repository.agent.AgentRoomRepository;
import com.alibaba.himarket.repository.agent.AgentWorkspaceRepository;
import com.alibaba.himarket.service.agent.AgentNacosSyncService;
import com.alibaba.himarket.service.agent.AgentRoomService;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class AgentRoomServiceImpl implements AgentRoomService {

    private static final String ROOM_PREFIX = "room-";
    private static final String ROOM_RESOURCE = "AgentRoom";
    private static final String WORKSPACE_RESOURCE = "AgentWorkspace";
    private static final String AUTH_MISMATCH_MESSAGE =
            "userId conflicts with authenticated principal";

    private final AgentRoomRepository roomRepository;
    private final AgentRoomConfigRepository roomConfigRepository;
    private final AgentWorkspaceRepository workspaceRepository;
    private final AgentRoomConverter roomConverter;
    private final ObjectMapper objectMapper;
    private final AgentNacosSyncService nacosSyncService;

    @Override
    @Transactional(readOnly = true)
    public List<AgentRoomResult> listRooms(String userId, String workspaceId) {
        String tenantId = resolveTenantId(userId);
        findWorkspace(workspaceId, tenantId);
        return roomRepository
                .findByWorkspaceUidAndTenantIdAndDeletedAtIsNullOrderByCreatedAtAsc(
                        workspaceId, tenantId)
                .stream()
                .map(roomConverter::toResult)
                .toList();
    }

    @Override
    public AgentRoomResult createRoom(String userId, String workspaceId, CreateRoomParam param) {
        String tenantId = resolveTenantId(userId);
        AgentWorkspaceEntity workspace = findWorkspace(workspaceId, tenantId);
        AgentRoomEntity room = buildRoom(userId, workspace, param);
        AgentRoomEntity savedRoom = roomRepository.save(room);
        roomConfigRepository.save(buildDefaultConfig(userId, savedRoom));
        publishRoomSnapshot(savedRoom.getRoomUid(), true);
        return roomConverter.toResult(savedRoom);
    }

    @Override
    @Transactional(readOnly = true)
    public AgentRoomResult getRoom(String userId, String roomId) {
        return roomConverter.toResult(findRoom(userId, roomId));
    }

    @Override
    public AgentRoomResult updateRoom(String userId, String roomId, UpdateRoomParam param) {
        AgentRoomEntity room = findRoom(userId, roomId);
        room.setName(param.getName());
        room.setModelId(param.getModelId());
        room.setTeamTemplateId(param.getTeamTemplateId());
        room.setUpdatedAt(LocalDateTime.now());
        AgentRoomEntity saved = roomRepository.saveAndFlush(room);
        publishRoomSnapshot(saved.getRoomUid(), false);
        return roomConverter.toResult(saved);
    }

    @Override
    public void deleteRoom(String userId, String roomId) {
        AgentRoomEntity room = findRoom(userId, roomId);
        room.setDeletedAt(LocalDateTime.now());
        room.setUpdatedAt(room.getDeletedAt());
        roomRepository.saveAndFlush(room);
        publishRoomSnapshot(room.getRoomUid(), true);
    }

    private void publishRoomSnapshot(String roomId, boolean workspaceListChanged) {
        if (workspaceListChanged) {
            nacosSyncService.publishWorkspaceList();
        }
        nacosSyncService.publishRoomConfig(roomId);
        nacosSyncService.publishSkillBinding(roomId);
    }

    private AgentRoomEntity buildRoom(
            String userId, AgentWorkspaceEntity workspace, CreateRoomParam param) {
        String roomId = IdGenerator.genIdWithPrefix(ROOM_PREFIX);
        LocalDateTime now = LocalDateTime.now();
        AgentRoomPermissionResult permission = defaultPermission(userId);
        return AgentRoomEntity.builder()
                .roomUid(roomId)
                .workspaceUid(workspace.getWorkspaceUid())
                .tenantId(workspace.getTenantId())
                .name(param.getName())
                .modelId(param.getModelId())
                .teamTemplateId(param.getTeamTemplateId())
                .fileRoot(fileRoot(workspace.getWorkspaceUid(), roomId))
                .permissionJson(writeJson(permission))
                .createdAt(now)
                .updatedAt(now)
                .build();
    }

    private AgentRoomConfigEntity buildDefaultConfig(String userId, AgentRoomEntity room) {
        AgentRoomConfigResult result =
                AgentRoomConfigResult.builder()
                        .roomId(room.getRoomUid())
                        .modelId(room.getModelId())
                        .teamTemplateId(room.getTeamTemplateId())
                        .skillBindings(List.of())
                        .mcpBindings(List.of())
                        .permission(defaultPermission(userId))
                        .build();
        return AgentRoomConfigEntity.builder()
                .roomUid(room.getRoomUid())
                .configJson(writeJson(result))
                .version(1L)
                .updatedAt(room.getCreatedAt())
                .build();
    }

    private AgentWorkspaceEntity findWorkspace(String workspaceId, String tenantId) {
        return workspaceRepository
                .findByWorkspaceUidAndTenantIdAndDeletedAtIsNull(workspaceId, tenantId)
                .orElseThrow(
                        () ->
                                new BusinessException(
                                        ErrorCode.NOT_FOUND, WORKSPACE_RESOURCE, workspaceId));
    }

    private AgentRoomEntity findRoom(String userId, String roomId) {
        return roomRepository
                .findByRoomUidAndTenantIdAndDeletedAtIsNull(roomId, resolveTenantId(userId))
                .orElseThrow(
                        () -> new BusinessException(ErrorCode.NOT_FOUND, ROOM_RESOURCE, roomId));
    }

    private AgentRoomPermissionResult defaultPermission(String userId) {
        return AgentRoomPermissionResult.builder()
                .readonly(Boolean.FALSE)
                .allowedUserIds(List.of(userId))
                .build();
    }

    private String fileRoot(String workspaceId, String roomId) {
        return "/workspaces/" + workspaceId + "/rooms/" + roomId;
    }

    private String writeJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException e) {
            throw new BusinessException(ErrorCode.INTERNAL_ERROR, e, "Agent JSON serialization");
        }
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
