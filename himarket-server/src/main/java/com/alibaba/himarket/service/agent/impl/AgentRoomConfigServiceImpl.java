package com.alibaba.himarket.service.agent.impl;

import com.alibaba.himarket.core.exception.BusinessException;
import com.alibaba.himarket.core.exception.ErrorCode;
import com.alibaba.himarket.dto.converter.agent.AgentRoomConfigConverter;
import com.alibaba.himarket.dto.params.agent.BindingRefParam;
import com.alibaba.himarket.dto.params.agent.UpdateRoomConfigParam;
import com.alibaba.himarket.dto.result.agent.AgentBindingRefResult;
import com.alibaba.himarket.dto.result.agent.AgentRoomConfigResult;
import com.alibaba.himarket.dto.result.agent.AgentRoomPermissionResult;
import com.alibaba.himarket.entity.agent.AgentRoomConfigEntity;
import com.alibaba.himarket.entity.agent.AgentRoomEntity;
import com.alibaba.himarket.repository.agent.AgentRoomConfigRepository;
import com.alibaba.himarket.repository.agent.AgentRoomRepository;
import com.alibaba.himarket.service.agent.AgentNacosSyncService;
import com.alibaba.himarket.service.agent.AgentRoomConfigService;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class AgentRoomConfigServiceImpl implements AgentRoomConfigService {

    private static final String ROOM_RESOURCE = "AgentRoom";
    private static final String CONFIG_RESOURCE = "AgentRoomConfig";
    private static final String AUTH_MISMATCH_MESSAGE =
            "userId conflicts with authenticated principal";
    private static final String ROOM_ID_MISMATCH_MESSAGE =
            "request roomId conflicts with path roomId";

    private final AgentRoomConfigRepository roomConfigRepository;
    private final AgentRoomRepository roomRepository;
    private final AgentRoomConfigConverter roomConfigConverter;
    private final ObjectMapper objectMapper;
    private final AgentNacosSyncService nacosSyncService;

    @Override
    @Transactional(readOnly = true)
    public AgentRoomConfigResult getRoomConfig(String userId, String roomId) {
        findRoom(userId, roomId);
        return roomConfigConverter.toResult(findConfig(roomId));
    }

    @Override
    public AgentRoomConfigResult updateRoomConfig(
            String userId, String roomId, UpdateRoomConfigParam param) {
        requireMatchingRoomId(roomId, param);
        AgentRoomEntity room = findRoom(userId, roomId);
        AgentRoomConfigResult result = toResult(param);
        AgentRoomConfigEntity config = roomConfig(roomId);
        LocalDateTime now = LocalDateTime.now();
        updateRoom(room, result, now);
        updateConfig(config, result, now);
        AgentRoomConfigResult saved = saveConfig(config);
        nacosSyncService.publishRoomConfig(roomId);
        return saved;
    }

    private AgentRoomConfigResult saveConfig(AgentRoomConfigEntity config) {
        try {
            return roomConfigConverter.toResult(roomConfigRepository.saveAndFlush(config));
        } catch (OptimisticLockingFailureException e) {
            throw new BusinessException(ErrorCode.CONFLICT, e, "room config version conflict");
        }
    }

    private void updateRoom(AgentRoomEntity room, AgentRoomConfigResult result, LocalDateTime now) {
        room.setModelId(result.getModelId());
        room.setTeamTemplateId(result.getTeamTemplateId());
        room.setPermissionJson(writeJson(result.getPermission()));
        room.setUpdatedAt(now);
        roomRepository.save(room);
    }

    private void updateConfig(
            AgentRoomConfigEntity config, AgentRoomConfigResult result, LocalDateTime now) {
        config.setRoomUid(result.getRoomId());
        config.setConfigJson(writeJson(result));
        config.setUpdatedAt(now);
    }

    private AgentRoomConfigEntity roomConfig(String roomId) {
        return roomConfigRepository
                .findByRoomUid(roomId)
                .orElseGet(
                        () -> AgentRoomConfigEntity.builder().roomUid(roomId).version(1L).build());
    }

    private AgentRoomConfigEntity findConfig(String roomId) {
        return roomConfigRepository
                .findByRoomUid(roomId)
                .orElseThrow(
                        () -> new BusinessException(ErrorCode.NOT_FOUND, CONFIG_RESOURCE, roomId));
    }

    private AgentRoomEntity findRoom(String userId, String roomId) {
        return roomRepository
                .findByRoomUidAndTenantIdAndDeletedAtIsNull(roomId, resolveTenantId(userId))
                .orElseThrow(
                        () -> new BusinessException(ErrorCode.NOT_FOUND, ROOM_RESOURCE, roomId));
    }

    private AgentRoomConfigResult toResult(UpdateRoomConfigParam param) {
        return AgentRoomConfigResult.builder()
                .roomId(param.getRoomId())
                .modelId(param.getModelId())
                .teamTemplateId(param.getTeamTemplateId())
                .skillBindings(toBindingResults(param.getSkillBindings()))
                .mcpBindings(toBindingResults(param.getMcpBindings()))
                .permission(toPermissionResult(param))
                .build();
    }

    private List<AgentBindingRefResult> toBindingResults(List<BindingRefParam> bindings) {
        return bindings.stream().map(this::toBindingResult).toList();
    }

    private AgentBindingRefResult toBindingResult(BindingRefParam binding) {
        return AgentBindingRefResult.builder()
                .productId(binding.getProductId())
                .version(binding.getVersion())
                .status(binding.getStatus())
                .build();
    }

    private AgentRoomPermissionResult toPermissionResult(UpdateRoomConfigParam param) {
        return AgentRoomPermissionResult.builder()
                .readonly(param.getPermission().getReadonly())
                .allowedUserIds(param.getPermission().getAllowedUserIds())
                .build();
    }

    private void requireMatchingRoomId(String roomId, UpdateRoomConfigParam param) {
        if (!roomId.equals(param.getRoomId())) {
            throw new BusinessException(ErrorCode.CONFLICT, ROOM_ID_MISMATCH_MESSAGE);
        }
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
